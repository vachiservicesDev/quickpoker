import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface RoomRecord<S = unknown> {
  code: string;
  kind: string;
  state: S;
  version: number;
}

export type HotOp = { type: "join" | "poker.vote" | "retro.addCard" | "retro.vote" | "retro.unvote"; actor: string } & Record<string, unknown>;
export type Presence = Record<string, number>;
export interface ReadResult {
  version: number;
  kind: string;
  state: unknown | null;
  presence: Presence | null;
}
export interface OpResult {
  version: number;
  state: unknown;
  presence: Presence;
}

/** Errors raised by qp_apply_op look like "qp:409:message". */
export class OpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export interface Beat {
  code: string;
  id: string;
  hash: string;
}

export type UpdateResult = { ok: true; version: number } | { ok: false; current: RoomRecord | null };

export interface RoomStore {
  get<S>(code: string): Promise<RoomRecord<S> | null>;
  /**
   * The polling read, in one round trip. State and presence are null when the
   * room hasn't changed since `since`. With `beat`, also records that the
   * viewer is online, if their secret hash matches. Null if the room is gone.
   */
  read(code: string, since: number | null, viewer: { id: string; hash: string } | null, beat: boolean): Promise<ReadResult | null>;
  /** Returns false when the code is already taken. */
  insert(code: string, kind: string, state: unknown): Promise<boolean>;
  /**
   * Writes only if the stored version still matches. On a conflict, returns the
   * current room (or null if it was deleted) so the caller can retry at once.
   */
  update(code: string, expectedVersion: number, state: unknown): Promise<UpdateResult>;
  /**
   * Applies one of the busiest clicks atomically. Supabase runs it in Postgres
   * under a row lock (see qp_room_op); the memory store runs `local` directly.
   */
  applyOp(code: string, op: HotOp, local: (state: unknown) => unknown): Promise<OpResult>;
  heartbeat(code: string, participantId: string): Promise<void>;
  /** Many heartbeats in one call; each counts only if its secret hash matches. */
  heartbeats(beats: Beat[]): Promise<void>;
  presence(code: string): Promise<Record<string, number>>;
  saveFeedback(entry: { message: string; contact: string | null; page: string | null }): Promise<void>;
}

class SupabaseStore implements RoomStore {
  constructor(private db: SupabaseClient) {}

  async get<S>(code: string) {
    const { data, error } = await this.db.from("rooms").select("code, kind, state, version").eq("code", code).maybeSingle();
    if (error) throw error;
    return (data as RoomRecord<S> | null) ?? null;
  }

  async read(code: string, since: number | null, viewer: { id: string; hash: string } | null, beat: boolean) {
    const { data, error } = await this.db.rpc("qp_read_room", {
      p_code: code,
      p_since: since,
      p_viewer: viewer?.id ?? null,
      p_viewer_hash: viewer?.hash ?? null,
      p_beat: beat,
    });
    if (error) throw error;
    return ((data as ReadResult[] | null)?.[0] ?? null) as ReadResult | null;
  }

  async insert(code: string, kind: string, state: unknown) {
    const { error } = await this.db.from("rooms").insert({ code, kind, state, version: 1 });
    if (error?.code === "23505") return false;
    if (error) throw error;
    return true;
  }

  async update(code: string, expectedVersion: number, state: unknown): Promise<UpdateResult> {
    const { data, error } = await this.db.rpc("qp_update_room", { p_code: code, p_expected: expectedVersion, p_state: state });
    if (error) throw error;
    const row = (data as { ok: boolean; version: number; kind: string; state: unknown }[] | null)?.[0];
    if (!row) return { ok: false, current: null };
    if (row.ok) return { ok: true, version: row.version };
    return { ok: false, current: { code, kind: row.kind, state: row.state, version: row.version } };
  }

  async applyOp(code: string, op: HotOp) {
    const { data, error } = await this.db.rpc("qp_room_op", { p_code: code, p_op: op });
    if (error) {
      const m = /^qp:(\d{3}):([\s\S]*)$/.exec(error.message ?? "");
      if (m) throw new OpError(m[2], Number(m[1]));
      throw error;
    }
    const row = (data as { new_version: number; new_state: unknown; new_presence: Presence }[])[0];
    return { version: row.new_version, state: row.new_state, presence: row.new_presence ?? {} };
  }

  async heartbeat(code: string, participantId: string) {
    const { error } = await this.db
      .from("presence")
      .upsert({ room_code: code, participant_id: participantId, last_seen: new Date().toISOString() });
    // A heartbeat for a room deleted a moment ago is harmless; ignore the foreign key error.
    if (error && error.code !== "23503") throw error;
  }

  async heartbeats(beats: Beat[]) {
    const { error } = await this.db.rpc("qp_heartbeats", { p_beats: beats });
    if (error) throw error;
  }

  async presence(code: string) {
    const { data, error } = await this.db.from("presence").select("participant_id, last_seen").eq("room_code", code);
    if (error) throw error;
    const out: Record<string, number> = {};
    for (const row of data ?? []) out[row.participant_id] = Date.parse(row.last_seen);
    return out;
  }

  async saveFeedback(entry: { message: string; contact: string | null; page: string | null }) {
    const { error } = await this.db.from("feedback").insert(entry);
    if (error) throw error;
  }
}

// For local development and tests only: state lives in this process, so it
// does not work across Vercel's serverless instances.
class MemoryStore implements RoomStore {
  rooms = new Map<string, RoomRecord & { lastActive: number }>();
  seen = new Map<string, Record<string, number>>();
  feedback: unknown[] = [];

  async get<S>(code: string) {
    const room = this.rooms.get(code);
    if (!room) return null;
    return structuredClone({ code: room.code, kind: room.kind, state: room.state as S, version: room.version });
  }

  async read(code: string, since: number | null, viewer: { id: string; hash: string } | null, beat: boolean) {
    const room = this.rooms.get(code);
    if (!room) return null;
    const participants = (room.state as { participants?: Record<string, { secretHash?: string }> }).participants ?? {};
    if (beat && viewer && participants[viewer.id]?.secretHash === viewer.hash) await this.heartbeat(code, viewer.id);
    if (since !== null && since === room.version) return { version: room.version, kind: room.kind, state: null, presence: null };
    return { version: room.version, kind: room.kind, state: structuredClone(room.state), presence: await this.presence(code) };
  }

  async insert(code: string, kind: string, state: unknown) {
    if (this.rooms.has(code)) return false;
    this.rooms.set(code, { code, kind, state: structuredClone(state), version: 1, lastActive: Date.now() });
    return true;
  }

  async update(code: string, expectedVersion: number, state: unknown): Promise<UpdateResult> {
    const room = this.rooms.get(code);
    if (!room) return { ok: false, current: null };
    if (room.version !== expectedVersion) {
      return { ok: false, current: structuredClone({ code, kind: room.kind, state: room.state, version: room.version }) };
    }
    room.state = structuredClone(state);
    room.version += 1;
    room.lastActive = Date.now();
    return { ok: true, version: room.version };
  }

  async applyOp(code: string, op: HotOp, local: (state: unknown) => unknown) {
    const room = this.rooms.get(code);
    if (!room) throw new OpError("This room doesn't exist. Rooms are deleted 24 hours after their last use.", 404);
    // No await between read and write, so this is atomic in a single process.
    room.state = structuredClone(local(structuredClone(room.state)));
    room.version += 1;
    room.lastActive = Date.now();
    if (op.type === "join") await this.heartbeat(code, op.actor);
    return { version: room.version, state: structuredClone(room.state), presence: await this.presence(code) };
  }

  async heartbeat(code: string, participantId: string) {
    const room = this.seen.get(code) ?? {};
    room[participantId] = Date.now();
    this.seen.set(code, room);
  }

  async heartbeats(beats: Beat[]) {
    for (const b of beats) {
      const participants = (this.rooms.get(b.code)?.state as { participants?: Record<string, { secretHash?: string }> } | undefined)?.participants;
      if (participants?.[b.id]?.secretHash === b.hash) await this.heartbeat(b.code, b.id);
    }
  }

  async presence(code: string) {
    return { ...(this.seen.get(code) ?? {}) };
  }

  async saveFeedback(entry: unknown) {
    this.feedback.push(entry);
  }
}

const g = globalThis as unknown as { __qpStore?: RoomStore };

export function getStore(): RoomStore {
  if (g.__qpStore) return g.__qpStore;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    g.__qpStore = new SupabaseStore(createClient(url, key, { auth: { persistSession: false } }));
  } else if (process.env.NODE_ENV !== "production" || process.env.QP_MEMORY_STORE === "1") {
    g.__qpStore = new MemoryStore();
  } else {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production.");
  }
  return g.__qpStore;
}

export function setStoreForTests(store: RoomStore) {
  g.__qpStore = store;
}

export { MemoryStore };
