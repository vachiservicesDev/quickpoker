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
  const record = await load(code);
  const actorId = authenticate(record.state, identity);
  if (!actorId) throw new RoomError("Join the room first.", 401);

  // Check the action against the room as we just read it, for friendly errors.
  const preview = applyAction(record.state, actorId, action);
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
    ({ state, version } = await mutate(code, (s) => applyAction(s, actorId, action), record));
    presence = await getStore().presence(code);
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
  const result = await getStore().read(code, since, viewer, heartbeat);
  if (!result || (result.kind !== "poker" && result.kind !== "retro")) throw new RoomError(NOT_FOUND, 404);
  if (result.state === null) return null;
  const state = result.state as AnyState;
  const viewerId = authenticate(state, identity);
  return { version: result.version, room: view(state, viewerId, result.presence ?? {}) };
}
