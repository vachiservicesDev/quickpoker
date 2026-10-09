import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface RoomRecord<S = unknown> {
  code: string;
  kind: string;
  state: S;
  version: number;
}

export interface RoomStore {
  get<S>(code: string): Promise<RoomRecord<S> | null>;
  /** Returns false when the code is already taken. */
  insert(code: string, kind: string, state: unknown): Promise<boolean>;
  /** Writes only if the stored version still matches. Returns the new version, or null on a conflict. */
  update(code: string, expectedVersion: number, state: unknown): Promise<number | null>;
  heartbeat(code: string, participantId: string): Promise<void>;
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

  async insert(code: string, kind: string, state: unknown) {
    const { error } = await this.db.from("rooms").insert({ code, kind, state, version: 1 });
    if (error?.code === "23505") return false;
    if (error) throw error;
    return true;
  }

  async update(code: string, expectedVersion: number, state: unknown) {
    const { data, error } = await this.db
      .from("rooms")
      .update({ state, version: expectedVersion + 1, last_active_at: new Date().toISOString() })
      .eq("code", code)
      .eq("version", expectedVersion)
      .select("version");
    if (error) throw error;
    return data && data.length > 0 ? (data[0].version as number) : null;
  }

  async heartbeat(code: string, participantId: string) {
    const { error } = await this.db
      .from("presence")
      .upsert({ room_code: code, participant_id: participantId, last_seen: new Date().toISOString() });
    // A heartbeat for a room deleted a moment ago is harmless; ignore the foreign key error.
    if (error && error.code !== "23503") throw error;
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

  async insert(code: string, kind: string, state: unknown) {
    if (this.rooms.has(code)) return false;
    this.rooms.set(code, { code, kind, state: structuredClone(state), version: 1, lastActive: Date.now() });
    return true;
  }

  async update(code: string, expectedVersion: number, state: unknown) {
    const room = this.rooms.get(code);
    if (!room || room.version !== expectedVersion) return null;
    room.state = structuredClone(state);
    room.version += 1;
    room.lastActive = Date.now();
    return room.version;
  }

  async heartbeat(code: string, participantId: string) {
    const room = this.seen.get(code) ?? {};
    room[participantId] = Date.now();
    this.seen.set(code, room);
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
