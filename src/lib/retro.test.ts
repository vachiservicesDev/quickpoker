import { describe, expect, it } from "vitest";
import { RoomError } from "./poker";
import { applyRetroAction, createRetroRoom, joinRetroRoom, retroSummary, retroView, type RetroState } from "./retro";

let n = 0;
const ctx = { newId: () => `id${++n}`, now: 1_000 };

function board(): RetroState {
  let s = createRetroRoom({ facilitatorName: "Priya", votesPerPerson: 2 }, { id: "fac", secretHash: "h" }, ctx);
  s = joinRetroRoom(s, { name: "Marcus" }, { id: "m", secretHash: "h" }, ctx);
  return s;
}

describe("retro board", () => {
  it("hides other people's card text while writing and never sends authors", () => {
    let s = applyRetroAction(board(), "m", { type: "addCard", columnId: "well", text: "Deploys were smooth" }, ctx);
    const facView = retroView(s, "fac", {}, 0);
    expect(facView.cards[0]).toMatchObject({ text: null, mine: false });
    expect(retroView(s, "m", {}, 0).cards[0]).toMatchObject({ text: "Deploys were smooth", mine: true });
    expect(JSON.stringify(facView)).not.toContain("authorId");
    expect(JSON.stringify(facView)).not.toContain("secretHash");
    s = applyRetroAction(s, "fac", { type: "setPhase", phase: "vote" }, ctx);
    expect(retroView(s, "fac", {}, 0).cards[0].text).toBe("Deploys were smooth");
  });

  it("limits votes per person and shows totals only in Discuss", () => {
    let s = applyRetroAction(board(), "m", { type: "addCard", columnId: "well", text: "A" }, ctx);
    const cardId = s.cards[0].id;
    s = applyRetroAction(s, "fac", { type: "setPhase", phase: "vote" }, ctx);
    s = applyRetroAction(s, "m", { type: "vote", cardId }, ctx);
    s = applyRetroAction(s, "m", { type: "vote", cardId }, ctx);
    expect(() => applyRetroAction(s, "m", { type: "vote", cardId }, ctx)).toThrow(/used all 2 votes/);
    expect(retroView(s, "m", {}, 0).cards[0]).toMatchObject({ votes: null, myVotes: 2 });
    expect(retroView(s, "m", {}, 0).me?.votesLeft).toBe(0);
    s = applyRetroAction(s, "fac", { type: "setPhase", phase: "discuss" }, ctx);
    expect(retroView(s, "fac", {}, 0).cards[0].votes).toBe(2);
  });

  it("only lets the facilitator change steps and the timer", () => {
    expect(() => applyRetroAction(board(), "m", { type: "setPhase", phase: "vote" }, ctx)).toThrow(RoomError);
    expect(() => applyRetroAction(board(), "m", { type: "startTimer", minutes: 5 }, ctx)).toThrow(RoomError);
    const s = applyRetroAction(board(), "fac", { type: "startTimer", minutes: 5 }, ctx);
    expect(s.timer.endsAt).toBe(ctx.now + 300_000);
  });

  it("lets authors edit their own cards and the facilitator delete any", () => {
    let s = applyRetroAction(board(), "m", { type: "addCard", columnId: "improve", text: "Too many meetings" }, ctx);
    const cardId = s.cards[0].id;
    expect(() => applyRetroAction(s, "fac", { type: "editCard", cardId, text: "x" }, ctx)).toThrow(/own cards/);
    s = applyRetroAction(s, "m", { type: "editCard", cardId, text: "Too many status meetings" }, ctx);
    expect(s.cards[0].text).toBe("Too many status meetings");
    s = applyRetroAction(s, "fac", { type: "deleteCard", cardId }, ctx);
    expect(s.cards).toHaveLength(0);
  });

  it("builds a plain-text summary with votes and action items", () => {
    let s = applyRetroAction(board(), "m", { type: "addCard", columnId: "well", text: "Pairing helped" }, ctx);
    s = applyRetroAction(s, "fac", { type: "addAction", text: "Book a pairing slot", owner: "Marcus" }, ctx);
    s = applyRetroAction(s, "fac", { type: "setPhase", phase: "discuss" }, ctx);
    const text = retroSummary(retroView(s, "fac", {}, 0), "https://example.test/r/ABCDEF");
    expect(text).toContain("WENT WELL (1)");
    expect(text).toContain("- Pairing helped");
    expect(text).toContain("[ ] Book a pairing slot (owner: Marcus)");
  });
});
