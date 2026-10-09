// Load simulation: many rooms at once, with everyone in a room clicking at the
// same moment. Runs the real room code against an in-memory store that adds a
// database round-trip delay, so write conflicts happen the way they would in
// production. Run with: npx vitest run src/lib/load.test.ts
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { HotOp } from "./store";

vi.mock("server-only", () => ({}));

const { MemoryStore, setStoreForTests } = await import("./store");
const { actInRoom, createRoom, joinRoom, readRoom } = await import("./rooms");

const DB_MS = 20; // a pessimistic Vercel-to-Supabase round trip
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class SlowStore extends MemoryStore {
  async get<S>(code: string) { await sleep(DB_MS); return super.get<S>(code); }
  async read(code: string, since: number | null, viewer: { id: string; hash: string } | null, beat: boolean) { await sleep(DB_MS); return super.read(code, since, viewer, beat); }
  async insert(code: string, kind: string, state: unknown) { await sleep(DB_MS); return super.insert(code, kind, state); }
  async update(code: string, v: number, state: unknown) { await sleep(DB_MS); return super.update(code, v, state); }
  async heartbeat(code: string, id: string) { await sleep(DB_MS); return super.heartbeat(code, id); }
  // Postgres row lock: atomic ops on one room run one after another, each
  // holding the lock for a few milliseconds.
  locks = new Map<string, Promise<unknown>>();
  async applyOp(code: string, op: HotOp, local: (s: unknown) => unknown) {
    await sleep(DB_MS / 2);
    const prev = this.locks.get(code) ?? Promise.resolve();
    const run = prev.catch(() => {}).then(async () => { await sleep(3); return super.applyOp(code, op, local); });
    this.locks.set(code, run);
    const result = await run;
    await sleep(DB_MS / 2);
    return result;
  }
  async presence(code: string) { await sleep(DB_MS); return super.presence(code); }
}

beforeAll(() => setStoreForTests(new SlowStore()));

function pct(values: number[], p: number) {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

async function timed<T>(fn: () => Promise<T>, latencies: number[], failures: string[]) {
  const t = performance.now();
  try {
    return await fn();
  } catch (err) {
    failures.push((err as Error).message);
    return null;
  } finally {
    latencies.push(performance.now() - t);
  }
}

async function pokerTeam(size: number, latencies: number[], failures: string[]) {
  const room = await createRoom({ kind: "poker", name: "Facilitator" });
  const fac = { participantId: room.participantId, secret: room.secret };
  // Everyone opens the link at once.
  const people = await Promise.all(
    Array.from({ length: size - 1 }, (_, i) => timed(() => joinRoom(room.code, { name: `P${i}` }), latencies, failures)),
  );
  const ids = [fac, ...people.filter(Boolean).map((p) => ({ participantId: p!.participantId, secret: p!.secret }))];
  await timed(() => actInRoom(room.code, fac, { type: "addStories", titles: ["Story A", "Story B", "Story C"] }), latencies, failures);
  for (let round = 0; round < 3; round++) {
    // Everyone votes in the same second.
    await Promise.all(ids.map((id, i) => timed(() => actInRoom(room.code, id, { type: "vote", value: ["3", "5", "8"][i % 3] }), latencies, failures)));
    await timed(() => actInRoom(room.code, fac, { type: "reveal" }), latencies, failures);
    await timed(() => actInRoom(room.code, fac, { type: "saveEstimate", value: "5" }), latencies, failures);
  }
  const final = await readRoom(room.code, fac, null, false);
  return final?.room.kind === "poker" ? final.room.stories.filter((s) => s.estimate).length : 0;
}

async function retroTeam(size: number, cardsEach: number, latencies: number[], failures: string[]) {
  const room = await createRoom({ kind: "retro", name: "Facilitator", votesPerPerson: 3 });
  const fac = { participantId: room.participantId, secret: room.secret };
  const people = await Promise.all(
    Array.from({ length: size - 1 }, (_, i) => timed(() => joinRoom(room.code, { name: `P${i}` }), latencies, failures)),
  );
  const ids = [fac, ...people.filter(Boolean).map((p) => ({ participantId: p!.participantId, secret: p!.secret }))];
  // Everyone writes cards at the same time.
  await Promise.all(
    ids.flatMap((id, i) =>
      Array.from({ length: cardsEach }, (_, c) =>
        timed(() => actInRoom(room.code, id, { type: "addCard", columnId: ["well", "improve", "try"][c % 3], text: `Card ${i}-${c}` }), latencies, failures),
      ),
    ),
  );
  const afterWrite = await actInRoom(room.code, fac, { type: "setPhase", phase: "vote" });
  const cards = afterWrite.room.kind === "retro" ? afterWrite.room.cards : [];
  // Everyone spends three votes at the same time.
  await Promise.all(
    ids.flatMap((id, i) =>
      [0, 1, 2].map((v) => timed(() => actInRoom(room.code, id, { type: "vote", cardId: cards[(i + v) % cards.length].id }), latencies, failures)),
    ),
  );
  await actInRoom(room.code, fac, { type: "setPhase", phase: "discuss" });
  const final = await readRoom(room.code, fac, null, false);
  if (final?.room.kind !== "retro") return { cards: 0, votes: 0 };
  return { cards: final.room.cards.length, votes: final.room.cards.reduce((n, c) => n + (c.votes ?? 0), 0) };
}

describe("load", () => {
  it("handles 100 planning poker teams of 10 voting at the same moment", { timeout: 120_000 }, async () => {
    const latencies: number[] = [];
    const failures: string[] = [];
    const t = performance.now();
    const done = await Promise.all(Array.from({ length: 100 }, () => pokerTeam(10, latencies, failures)));
    console.log(
      `poker: 100 teams x 10 people, ${latencies.length} writes in ${Math.round(performance.now() - t)} ms; ` +
        `p50 ${Math.round(pct(latencies, 50))} ms, p95 ${Math.round(pct(latencies, 95))} ms, p99 ${Math.round(pct(latencies, 99))} ms; failures ${failures.length}`,
    );
    expect(failures).toEqual([]);
    expect(done.every((n) => n === 3)).toBe(true);
  });

  it("handles 100 retro teams of 10 writing and voting at the same moment", { timeout: 120_000 }, async () => {
    const latencies: number[] = [];
    const failures: string[] = [];
    const t = performance.now();
    const results = await Promise.all(Array.from({ length: 100 }, () => retroTeam(10, 4, latencies, failures)));
    console.log(
      `retro: 100 teams x 10 people, ${latencies.length} writes in ${Math.round(performance.now() - t)} ms; ` +
        `p50 ${Math.round(pct(latencies, 50))} ms, p95 ${Math.round(pct(latencies, 95))} ms, p99 ${Math.round(pct(latencies, 99))} ms; failures ${failures.length}`,
    );
    expect(failures).toEqual([]);
    expect(results.every((r) => r.cards === 40 && r.votes === 30)).toBe(true);
  });

  it("handles one 50-person retro where everyone clicks at once", { timeout: 120_000 }, async () => {
    const latencies: number[] = [];
    const failures: string[] = [];
    const r = await retroTeam(50, 2, latencies, failures);
    console.log(
      `big retro: 50 people, ${latencies.length} writes; p50 ${Math.round(pct(latencies, 50))} ms, p95 ${Math.round(pct(latencies, 95))} ms, ` +
        `max ${Math.round(Math.max(...latencies))} ms; failures ${failures.length} ${[...new Set(failures)].join(" | ")}; cards ${r.cards}, votes ${r.votes}`,
    );
    expect(failures).toEqual([]);
  });
});
