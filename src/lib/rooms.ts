import "server-only";
import { broadcastRoomChanged } from "./broadcast";
import { hashSecret, newId, newRoomCode, newSecret } from "./ids";
import {
  applyPokerAction,
  createPokerRoom,
  joinPokerRoom,
  pokerView,
  RoomError,
  type Participant,
  type PokerAction,
  type PokerState,
  type PokerView,
} from "./poker";
import { applyRetroAction, createRetroRoom, RETRO_LIMITS, joinRetroRoom, retroView, type RetroAction, type RetroState, type RetroView } from "./retro";
import { getStore, OpError, type HotOp } from "./store";

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

async function mutate(code: string, change: (state: AnyState) => AnyState) {
  const store = getStore();
  const started = Date.now();
  let record = await load(code);
  for (let attempt = 0; ; attempt++) {
    const next = change(record.state);
    const result = await store.update(code, record.version, next);
    if (result.ok) {
      await broadcastRoomChanged(code, result.version);
      return { state: next, version: result.version };
    }
    if (!result.current) throw new RoomError(NOT_FOUND, 404);
    record = result.current as typeof record;
    if (Date.now() - started > SAVE_BUDGET_MS) throw new RoomError("The room is busy. Try again.", 503);
    // A little jitter so a burst of clicks spreads out instead of colliding again.
    await new Promise((r) => setTimeout(r, Math.random() * Math.min(60, 5 + attempt * 5)));
  }
}

export async function joinRoom(code: string, input: Record<string, unknown>): Promise<Joined> {
  const participantId = newId();
  const secret = newSecret();
  const participant = { id: participantId, secretHash: hashSecret(secret) };
  const { state, version } = await mutate(code, (s) =>
    s.kind === "retro"
      ? joinRetroRoom(s, { name: input.name }, participant, ctx())
      : joinPokerRoom(s, { name: input.name, role: input.role }, participant, ctx()),
  );
  await getStore().heartbeat(code, participantId);
  const presence = await getStore().presence(code);
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
  if (op) {
    try {
      const card = op.type === "retro.addCard" ? (op.card as { id: string }) : null;
      // The memory store replays the same change; reuse the card id from the preview.
      const local = (s: unknown) => applyAction(s as AnyState, actorId, action, { newId: () => card?.id ?? newId(), now: Date.now() });
      const result = await getStore().applyOp(code, op, local);
      state = result.state as AnyState;
      version = result.version;
    } catch (err) {
      if (err instanceof OpError) throw new RoomError(err.message, err.status);
      throw err;
    }
    await broadcastRoomChanged(code, version);
  } else {
    ({ state, version } = await mutate(code, (s) => applyAction(s, actorId, action)));
  }
  const presence = await getStore().presence(code);
  return { version, room: view(state, actorId in state.participants ? actorId : null, presence) };
}

/**
 * The polling read. Most polls find nothing new, so they cost one tiny query
 * (the version number). The browser asks for a heartbeat every 20 seconds or
 * so, not on every poll, to keep "who's online" fresh without a write per poll.
 */
export async function readRoom(code: string, identity: Identity | null, since: number | null, heartbeat: boolean) {
  const store = getStore();
  if (since !== null && !heartbeat) {
    const version = await store.getVersion(code);
    if (version === null) throw new RoomError(NOT_FOUND, 404);
    if (version === since) return null;
  }
  const record = await load(code);
  const viewerId = authenticate(record.state, identity);
  if (viewerId && heartbeat) await store.heartbeat(code, viewerId);
  if (since !== null && since === record.version) return null;
  const presence = await store.presence(code);
  return { version: record.version, room: view(record.state, viewerId, presence) };
}
