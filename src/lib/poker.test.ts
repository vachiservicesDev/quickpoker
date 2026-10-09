import { describe, expect, it } from "vitest";
import { applyPokerAction, createPokerRoom, joinPokerRoom, pokerStats, pokerView, RoomError, type PokerState } from "./poker";

let n = 0;
const ctx = { newId: () => `id${++n}`, now: 1_000 };

function room(): PokerState {
  let s = createPokerRoom({ facilitatorName: "Priya", deckId: "fibonacci" }, { id: "fac", secretHash: "h" }, ctx);
  s = joinPokerRoom(s, { name: "Marcus" }, { id: "m", secretHash: "h" }, ctx);
  s = joinPokerRoom(s, { name: "Lena", role: "observer" }, { id: "obs", secretHash: "h" }, ctx);
  return s;
}

describe("poker room", () => {
  it("hides votes until reveal", () => {
    let s = room();
    s = applyPokerAction(s, "m", { type: "vote", value: "5" }, ctx);
    const before = pokerView(s, "fac", {}, 0);
    expect(before.participants.find((p) => p.id === "m")).toMatchObject({ hasVoted: true, vote: null });

    expect(before.stats).toBeNull();
    expect(pokerView(s, "m", {}, 0).me?.vote).toBe("5");

    s = applyPokerAction(s, "fac", { type: "reveal" }, ctx);
    const after = pokerView(s, "fac", {}, 0);
    expect(after.participants.find((p) => p.id === "m")?.vote).toBe("5");
    expect(after.stats?.average).toBe(5);
  });

  it("never sends secret hashes to browsers", () => {
    expect(JSON.stringify(pokerView(room(), "fac", {}, 0))).not.toContain("secretHash");
  });

  it("only lets the facilitator reveal", () => {
    expect(() => applyPokerAction(room(), "m", { type: "reveal" }, ctx)).toThrow(RoomError);
  });

  it("rejects cards outside the deck and votes from observers", () => {
    expect(() => applyPokerAction(room(), "m", { type: "vote", value: "4" }, ctx)).toThrow(/isn't in this deck/);
    expect(() => applyPokerAction(room(), "obs", { type: "vote", value: "5" }, ctx)).toThrow(/Observers/);
  });

  it("saves an estimate and moves to the next unestimated story", () => {
    let s = applyPokerAction(room(), "fac", { type: "addStories", titles: ["A", " B ", ""] }, ctx);
    expect(s.stories.map((x) => x.title)).toEqual(["A", "B"]);
    const [a, b] = s.stories;
    expect(s.currentStoryId).toBe(a.id);
    s = applyPokerAction(s, "m", { type: "vote", value: "8" }, ctx);
    s = applyPokerAction(s, "fac", { type: "reveal" }, ctx);
    s = applyPokerAction(s, "fac", { type: "saveEstimate", value: "8" }, ctx);
    expect(s.stories[0].estimate).toBe("8");
    expect(s.currentStoryId).toBe(b.id);
    expect(s.votes).toEqual({});
    expect(s.revealed).toBe(false);
  });

  it("hands the facilitator role on when the facilitator leaves", () => {
    const s = applyPokerAction(room(), "fac", { type: "leave" }, ctx);
    expect(s.facilitatorId).toBe("m");
    expect(s.participants.fac).toBeUndefined();
  });

  it("does not mutate the input state", () => {
    const s = room();
    const copy = structuredClone(s);
    applyPokerAction(s, "m", { type: "vote", value: "3" }, ctx);
    expect(s).toEqual(copy);
  });
});

describe("pokerStats", () => {
  it("ignores Pass and suggests the larger card on a tie", () => {
    const deck = ["1", "2", "3", "5", "8", "?", "Pass"];
    expect(pokerStats(deck, ["3", "5", "Pass"])).toMatchObject({ average: 4, suggested: "5", consensus: false });
    expect(pokerStats(deck, ["5", "5"])).toMatchObject({ consensus: true, suggested: "5" });
  });

  it("has no average for T-shirt sizes", () => {
    expect(pokerStats(["S", "M", "L"], ["M", "M", "L"])).toMatchObject({ average: null, suggested: "M" });
  });
});
