import "server-only";
import { after } from "next/server";
import { getStore, type Beat, type Presence } from "./store";

// A one-second snapshot of each room, shared by every request this server
// instance handles. A team of ten polling the same room every two seconds then
// costs about one database call per second instead of five, and a burst of
// polls for one room shares a single call. This was the limit in the live
// 100-team test: Postgres itself answered in milliseconds, but Supabase's API
// layer queued requests once they passed roughly 100 a second.

export interface Snapshot {
  version: number;
  kind: string;
  state: unknown;
  presence: Presence;
  at: number;
}

const FRESH_MS = 1_000;
const MAX_ROOMS = 5_000;
const snapshots = new Map<string, Snapshot>();
const inflight = new Map<string, Promise<Snapshot | null>>();

/** Saves what a read or a write just saw, unless a newer version is already known. */
export function remember(code: string, s: Omit<Snapshot, "at">) {
  const current = snapshots.get(code);
  if (current && current.version > s.version) return;
  if (!current && snapshots.size >= MAX_ROOMS) {
    const oldest = snapshots.keys().next().value;
    if (oldest !== undefined) snapshots.delete(oldest);
  }
  snapshots.delete(code);
  snapshots.set(code, { ...s, at: Date.now() });
}

export function forget(code: string) {
  snapshots.delete(code);
}

/**
 * A snapshot no older than a second, or a fresh one from `fetch`. Concurrent
 * callers for the same room share one fetch. Null if the room is gone.
 */
export async function snapshot(code: string, fetch: () => Promise<Omit<Snapshot, "at"> | null>, minVersion = 0): Promise<Snapshot | null> {
  const cached = snapshots.get(code);
  if (cached && Date.now() - cached.at < FRESH_MS && cached.version >= minVersion) return cached;
  let pending = inflight.get(code);
  if (!pending) {
    pending = fetch()
      .then((s) => {
        if (!s) {
          forget(code);
          return null;
        }
        remember(code, s);
        return snapshots.get(code) ?? { ...s, at: Date.now() };
      })
      .finally(() => inflight.delete(code));
    inflight.set(code, pending);
  }
  return pending;
}

// Heartbeats wait here for about a second and go to the database together.
const FLUSH_MS = 1_000;
const beats = new Map<string, Beat>();
let flushing: Promise<void> | null = null;

async function flush() {
  await new Promise((r) => setTimeout(r, FLUSH_MS));
  const batch = [...beats.values()];
  beats.clear();
  flushing = null;
  if (batch.length) await getStore().heartbeats(batch).catch((err) => console.error("heartbeats failed", err));
}

export function queueHeartbeat(beat: Beat) {
  beats.set(`${beat.code}:${beat.id}`, beat);
  if (!flushing) flushing = flush();
  const pending = flushing;
  // Keep the function alive until the batch is sent.
  try {
    after(() => pending);
  } catch {
    // Outside a request (tests): the timer still runs.
  }
}

export function clearRoomCacheForTests() {
  snapshots.clear();
  inflight.clear();
}
