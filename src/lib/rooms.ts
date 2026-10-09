import "server-only";
import { broadcastRoomChanged } from "./broadcast";
import { hashSecret, newId, newRoomCode, newSecret } from "./ids";
import {
  applyPokerAction,
  createPokerRoom,
  joinPokerRoom,
  pokerView,
  RoomError,
  type PokerAction,
  type PokerState,
  type PokerView,
} from "./poker";
import { getStore } from "./store";

const ctx = () => ({ newId, now: Date.now() });

export interface Identity {
  participantId: string;
  secret: string;
}

export interface Joined extends Identity {
  code: string;
  version: number;
  room: PokerView;
}

export async function createRoom(input: Record<string, unknown>): Promise<Joined> {
  const store = getStore();
  const participantId = newId();
  const secret = newSecret();
  const state = createPokerRoom(
    { roomName: input.roomName, facilitatorName: input.name, deckId: input.deckId, cards: input.cards },
    { id: participantId, secretHash: hashSecret(secret) },
    ctx(),
  );
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newRoomCode();
    if (await store.insert(code, "poker", state)) {
      await store.heartbeat(code, participantId);
      return { code, participantId, secret, version: 1, room: pokerView(state, participantId, {}, Date.now()) };
    }
  }
  throw new RoomError("Couldn't create a room right now. Try again.", 503);
}

async function loadPoker(code: string) {
  const record = await getStore().get<PokerState>(code);
  if (!record || record.kind !== "poker") {
    throw new RoomError("This room doesn't exist. Rooms are deleted 24 hours after their last use.", 404);
  }
  return record;
}

function authenticate(state: PokerState, identity: Identity | null): string | null {
  if (!identity) return null;
  const p = state.participants[identity.participantId];
  if (!p || p.secretHash !== hashSecret(identity.secret)) return null;
  return p.id;
}

// Read-modify-write with optimistic concurrency: if someone else saved first,
// reload and apply the change again.
async function mutate(code: string, change: (state: PokerState) => PokerState) {
  const store = getStore();
  for (let attempt = 0; attempt < 8; attempt++) {
    const record = await loadPoker(code);
    const next = change(record.state);
    const version = await store.update(code, record.version, next);
    if (version !== null) {
      await broadcastRoomChanged(code, version);
      return { state: next, version };
    }
    await new Promise((r) => setTimeout(r, 10 + Math.random() * 40 * (attempt + 1)));
  }
  throw new RoomError("The room is busy. Try again.", 503);
}

export async function joinRoom(code: string, input: Record<string, unknown>): Promise<Joined> {
  const participantId = newId();
  const secret = newSecret();
  const { state, version } = await mutate(code, (s) =>
    joinPokerRoom(s, { name: input.name, role: input.role }, { id: participantId, secretHash: hashSecret(secret) }, ctx()),
  );
  await getStore().heartbeat(code, participantId);
  const presence = await getStore().presence(code);
  return { code, participantId, secret, version, room: pokerView(state, participantId, presence, Date.now()) };
}

export async function actInRoom(code: string, identity: Identity | null, action: PokerAction) {
  const record = await loadPoker(code);
  const actorId = authenticate(record.state, identity);
  if (!actorId) throw new RoomError("Join the room first.", 401);
  const { state, version } = await mutate(code, (s) => applyPokerAction(s, actorId, action, ctx()));
  const presence = await getStore().presence(code);
  return { version, room: pokerView(state, actorId in state.participants ? actorId : null, presence, Date.now()) };
}

export async function readRoom(code: string, identity: Identity | null, since: number | null) {
  const store = getStore();
  const record = await loadPoker(code);
  const viewerId = authenticate(record.state, identity);
  if (viewerId) await store.heartbeat(code, viewerId);
  if (since !== null && since === record.version) return null;
  const presence = await store.presence(code);
  return { version: record.version, room: pokerView(record.state, viewerId, presence, Date.now()) };
}
