import "server-only";
import { broadcastRoomChanged } from "./broadcast";
import { hashSecret, newId, newRoomCode, newSecret } from "./ids";
import {
  applyPokerAction,
  cleanText,
  createPokerRoom,
  LIMITS,
  joinPokerRoom,
  pokerView,
  RoomError,
  type Participant,
  type PokerAction,
  type PokerState,
  type PokerView,
} from "./poker";
import { applyRetroAction, createRetroRoom, RETRO_LIMITS, joinRetroRoom, retroView, type RetroAction, type RetroState, type RetroView } from "./retro";
import { queueHeartbeat, remember, snapshot } from "./roomCache";
import { getStore, OpError, type HotOp, type Presence } from "./store";

const ctx = () => ({ newId, now: Date.now() });

export type RoomKind = "poker" | "retro";
type AnyState = PokerState | RetroState;
export type AnyView = PokerView | RetroView;

export interface Identity {
  participantId: string;
  secret: string;
}

export interface Joined extends Identity {
  code: string;
  version: number;
  room: AnyView;
}

function view(state: AnyState, viewerId: string | null, presence: Record<string, number>): AnyView {
  return state.kind === "retro" ? retroView(state, viewerId, presence, Date.now()) : pokerView(state, viewerId, presence, Date.now());
}

export async function createRoom(input: Record<string, unknown>): Promise<Joined> {
  const store = getStore();
  const participantId = newId();
  const secret = newSecret();
  const facilitator = { id: participantId, secretHash: hashSecret(secret) };
  const state: AnyState =
    input.kind === "retro"
      ? createRetroRoom(
          { roomName: input.roomName, facilitatorName: input.name, templateId: input.templateId, votesPerPerson: input.votesPerPerson },
          facilitator,
          ctx(),
        )
      : createPokerRoom({ roomName: input.roomName, facilitatorName: input.name, deckId: input.deckId, cards: input.cards }, facilitator, ctx());
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newRoomCode();
    if (await store.insert(code, state.kind, state)) {
      await store.heartbeat(code, participantId);
      return { code, participantId, secret, version: 1, room: view(state, participantId, {}) };
    }
  }
  throw new RoomError("Couldn't create a room right now. Try again.", 503);
}

async function load(code: string) {
  const record = await getStore().get<AnyState>(code);
  if (!record || (record.kind !== "poker" && record.kind !== "retro")) {
    throw new RoomError(NOT_FOUND, 404);
  }
  return record;
}

// The room as this server saw it within the last second (see roomCache).
async function loadRecent(code: string, minVersion = 0) {
  const snap = await snapshot(
    code,
    async () => {
      const r = await getStore().read(code, null, null, false);
      return r && r.state !== null ? { version: r.version, kind: r.kind, state: r.state, presence: r.presence ?? {} } : null;
    },
    minVersion,
  );
  if (!snap || (snap.kind !== "poker" && snap.kind !== "retro")) throw new RoomError(NOT_FOUND, 404);
  return { code, kind: snap.kind, state: snap.state as AnyState, version: snap.version, presence: snap.presence };
}

function authenticate(state: AnyState, identity: Identity | null): string | null {
  if (!identity) return null;
  const p: Participant | undefined = state.participants[identity.participantId];
  if (!p || p.secretHash !== hashSecret(identity.secret)) return null;
  return p.id;
}

// Read-modify-write with optimistic concurrency. If someone else saved first,
// the store hands back the newer room and the change is re-applied to it at
// once, so each retry costs a single round trip. Retries run against a time
// budget rather than a fixed count: a 50-person retro where everyone clicks in
// the same second queues up and goes through instead of failing.
const SAVE_BUDGET_MS = 9_000;
const NOT_FOUND = "This room doesn't exist. Rooms are deleted 24 hours after their last use.";

async function mutate(code: string, change: (state: AnyState) => AnyState, loaded?: Awaited<ReturnType<typeof load>>) {
  const store = getStore();
  const started = Date.now();
  let record = loaded ?? (await load(code));
  for (let attempt = 0; ; attempt++) {
    const next = change(record.state);
    const result = await store.update(code, record.version, next);
    if (result.ok) {
      broadcastRoomChanged(code, result.version);
      return { state: next, version: result.version };
    }
    if (!result.current) throw new RoomError(NOT_FOUND, 404);
    record = result.current as typeof record;
    if (Date.now() - started > SAVE_BUDGET_MS) throw new RoomError("The room is busy. Try again.", 503);
    // A little jitter so a burst of clicks spreads out instead of colliding again.
    await new Promise((r) => setTimeout(r, Math.random() * Math.min(60, 5 + attempt * 5)));
  }
}

async function runOp(code: string, op: HotOp, local: (s: AnyState) => AnyState) {
  try {
    const result = await getStore().applyOp(code, op, (s) => local(s as AnyState));
    broadcastRoomChanged(code, result.version);
    remember(code, { version: result.version, kind: (result.state as AnyState).kind, state: result.state, presence: result.presence });
    return { state: result.state as AnyState, version: result.version, presence: result.presence };
  } catch (err) {
    if (err instanceof OpError) throw new RoomError(err.message, err.status);
    throw err;
  }
}

// Joining is the biggest burst of all (everyone opens the link when the
// meeting starts), so it goes to Postgres as one atomic step without a read.
export async function joinRoom(code: string, input: Record<string, unknown>): Promise<Joined> {
  const participantId = newId();
  const secret = newSecret();
  const participant: Participant = {
    id: participantId,
    name: cleanText(input.name, LIMITS.name, "name"),
    role: input.role === "observer" ? "observer" : "voter",
    secretHash: hashSecret(secret),
    joinedAt: Date.now(),
  };
  const op: HotOp = { type: "join", actor: participantId, participant, maxParticipants: Math.min(LIMITS.participants, RETRO_LIMITS.participants) };
  const { state, version, presence } = await runOp(code, op, (s) =>
    s.kind === "retro"
      ? joinRetroRoom(s, { name: participant.name }, participant, ctx())
      : joinPokerRoom(s, { name: participant.name, role: participant.role }, participant, ctx()),
  );
  return { code, participantId, secret, version, room: view(state, participantId, presence) };
}

// The clicks a whole team makes at the same moment. These go to Postgres as a
// single atomic step instead of read-modify-write, so a burst queues rather
// than colliding. Everything else is rare enough for optimistic saves.
function hotOp(state: AnyState, actorId: string, action: PokerAction | RetroAction, next: AnyState): HotOp | null {
  if (state.kind === "poker" && action.type === "vote") {
    return { type: "poker.vote", actor: actorId, value: (action as { value: string | null }).value ?? null };
  }
  if (state.kind === "retro" && next.kind === "retro") {
    if (action.type === "addCard") {
      const card = next.cards[next.cards.length - 1];
      return { type: "retro.addCard", actor: actorId, card, maxCards: RETRO_LIMITS.cards, maxPerPerson: RETRO_LIMITS.cardsPerPerson };
    }
    if (action.type === "vote" || action.type === "unvote") {
      return { type: `retro.${action.type}`, actor: actorId, cardId: (action as { cardId: string }).cardId };
    }
  }
  return null;
}

function applyAction(s: AnyState, actorId: string, action: PokerAction | RetroAction, c = ctx()): AnyState {
  return s.kind === "retro" ? applyRetroAction(s, actorId, action as RetroAction, c) : applyPokerAction(s, actorId, action as PokerAction, c);
}

export async function actInRoom(code: string, identity: Identity | null, action: PokerAction | RetroAction) {
  // Start from the room as seen within the last second. Postgres checks the
  // busy clicks again under a lock, and other saves fail on a stale version and
  // retry against the current room, so a slightly old copy is safe here.
  let record = await loadRecent(code);
  let actorId = authenticate(record.state, identity);
  let preview: AnyState | null = null;
  try {
    if (actorId) preview = applyAction(record.state, actorId, action);
  } catch (err) {
    if (!(err instanceof RoomError)) throw err;
  }
  if (!actorId || !preview) {
    // Before refusing, make sure the copy wasn't just out of date.
    record = { ...(await load(code)), presence: {} };
    actorId = authenticate(record.state, identity);
    if (!actorId) throw new RoomError("Join the room first.", 401);
    // Check the action against the room as we just read it, for friendly errors.
    preview = applyAction(record.state, actorId, action);
  }
  const op = hotOp(record.state, actorId, action, preview);
  let state: AnyState;
  let version: number;
  let presence: Presence;
  if (op) {
    const card = op.type === "retro.addCard" ? (op.card as { id: string }) : null;
    // The memory store replays the same change; reuse the card id from the preview.
    ({ state, version, presence } = await runOp(code, op, (s) =>
      applyAction(s, actorId, action, { newId: () => card?.id ?? newId(), now: Date.now() }),
    ));
  } else {
    const actor = actorId;
    ({ state, version } = await mutate(code, (s) => applyAction(s, actor, action), record));
    presence = await getStore().presence(code);
    remember(code, { version, kind: state.kind, state, presence });
  }
  return { version, room: view(state, actorId in state.participants ? actorId : null, presence) };
}

/**
 * The polling read: one database round trip. Most polls find nothing new and
 * get back just the version number. The browser asks for a heartbeat every 20
 * seconds or so, not on every poll, to keep "who's online" fresh.
 */
export async function readRoom(code: string, identity: Identity | null, since: number | null, heartbeat: boolean) {
  const viewer = identity ? { id: identity.participantId, hash: hashSecret(identity.secret) } : null;
  // Most polls: answer from this server's one-second snapshot of the room,
  // and send any heartbeat along with others in a batch.
  const recent = await loadRecent(code, since ?? 0);
  const viewerId = authenticate(recent.state, identity);
  if ((since === null || recent.version >= since) && (!heartbeat || viewerId)) {
    if (heartbeat && viewer) queueHeartbeat({ code, id: viewer.id, hash: viewer.hash });
    if (recent.version === since) return null;
    return { version: recent.version, room: view(recent.state, viewerId, recent.presence) };
  }
  const result = await getStore().read(code, since, viewer, heartbeat);
  if (!result || (result.kind !== "poker" && result.kind !== "retro")) throw new RoomError(NOT_FOUND, 404);
  if (result.state === null) return null;
  const state = result.state as AnyState;
  remember(code, { version: result.version, kind: result.kind, state, presence: result.presence ?? {} });
  return { version: result.version, room: view(state, authenticate(state, identity), result.presence ?? {}) };
}
