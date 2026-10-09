// Planning poker room logic. Pure functions over a JSON state document, so the
// same code runs against Supabase in production and an in-memory store in tests.

export const DECKS = {
  fibonacci: { label: "Fibonacci", cards: ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "?", "Pass"] },
  tshirt: { label: "T-shirt sizes", cards: ["XS", "S", "M", "L", "XL", "XXL", "?", "Pass"] },
  powers: { label: "Powers of 2", cards: ["0", "1", "2", "4", "8", "16", "32", "64", "?", "Pass"] },
} as const;

export type DeckId = keyof typeof DECKS | "custom";
export type Role = "voter" | "observer";

export const LIMITS = {
  name: 40,
  roomName: 80,
  storyTitle: 200,
  stories: 200,
  participants: 50,
  customCards: 20,
  cardLabel: 6,
};

export interface Participant {
  id: string;
  name: string;
  role: Role;
  secretHash: string;
  joinedAt: number;
}

export interface Story {
  id: string;
  title: string;
  estimate: string | null;
}

export interface PokerState {
  kind: "poker";
  name: string;
  deckId: DeckId;
  deck: string[];
  facilitatorId: string;
  participants: Record<string, Participant>;
  order: string[];
  stories: Story[];
  currentStoryId: string | null;
  votes: Record<string, string>;
  revealed: boolean;
}

export type PokerAction =
  | { type: "vote"; value: string | null }
  | { type: "reveal" }
  | { type: "reset" }
  | { type: "addStories"; titles: string[] }
  | { type: "removeStory"; storyId: string }
  | { type: "selectStory"; storyId: string | null }
  | { type: "saveEstimate"; value: string }
  | { type: "setDeck"; deckId: DeckId; cards?: string[] }
  | { type: "setRole"; role: Role }
  | { type: "rename"; name: string }
  | { type: "makeFacilitator"; participantId: string }
  | { type: "removeParticipant"; participantId: string }
  | { type: "leave" };

export class RoomError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export interface Ctx {
  newId: () => string;
  now: number;
}

export function cleanText(value: unknown, max: number, field: string): string {
  if (typeof value !== "string") throw new RoomError(`Enter a ${field}.`);
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) throw new RoomError(`Enter a ${field}.`);
  if (text.length > max) throw new RoomError(`Keep the ${field} under ${max} characters.`);
  return text;
}

export function resolveDeck(deckId: unknown, cards?: unknown): { deckId: DeckId; deck: string[] } {
  if (deckId === "custom") {
    if (!Array.isArray(cards)) throw new RoomError("Add at least two cards to a custom deck.");
    const deck = [...new Set(cards.map((c) => cleanText(c, LIMITS.cardLabel, "card label")))];
    if (deck.length < 2) throw new RoomError("Add at least two cards to a custom deck.");
    if (deck.length > LIMITS.customCards) throw new RoomError(`Use at most ${LIMITS.customCards} cards.`);
    return { deckId: "custom", deck };
  }
  if (typeof deckId === "string" && deckId in DECKS) {
    const id = deckId as keyof typeof DECKS;
    return { deckId: id, deck: [...DECKS[id].cards] };
  }
  return { deckId: "fibonacci", deck: [...DECKS.fibonacci.cards] };
}

export function createPokerRoom(
  input: { roomName?: unknown; facilitatorName: unknown; deckId?: unknown; cards?: unknown },
  facilitator: { id: string; secretHash: string },
  ctx: Ctx,
): PokerState {
  const name =
    typeof input.roomName === "string" && input.roomName.trim()
      ? cleanText(input.roomName, LIMITS.roomName, "room name")
      : "Planning poker";
  const { deckId, deck } = resolveDeck(input.deckId, input.cards);
  return {
    kind: "poker",
    name,
    deckId,
    deck,
    facilitatorId: facilitator.id,
    participants: {
      [facilitator.id]: {
        id: facilitator.id,
        name: cleanText(input.facilitatorName, LIMITS.name, "name"),
        role: "voter",
        secretHash: facilitator.secretHash,
        joinedAt: ctx.now,
      },
    },
    order: [facilitator.id],
    stories: [],
    currentStoryId: null,
    votes: {},
    revealed: false,
  };
}

export function joinPokerRoom(
  state: PokerState,
  input: { name: unknown; role?: unknown },
  participant: { id: string; secretHash: string },
  ctx: Ctx,
): PokerState {
  if (state.order.length >= LIMITS.participants) {
    throw new RoomError(`This room is full (${LIMITS.participants} people).`, 409);
  }
  const next = structuredClone(state);
  next.participants[participant.id] = {
    id: participant.id,
    name: cleanText(input.name, LIMITS.name, "name"),
    role: input.role === "observer" ? "observer" : "voter",
    secretHash: participant.secretHash,
    joinedAt: ctx.now,
  };
  next.order.push(participant.id);
  return next;
}

function clearRound(state: PokerState) {
  state.votes = {};
  state.revealed = false;
}

function requireFacilitator(state: PokerState, actorId: string) {
  if (state.facilitatorId !== actorId) {
    throw new RoomError("Only the facilitator can do that.", 403);
  }
}

function removeFromRoom(state: PokerState, participantId: string) {
  delete state.participants[participantId];
  delete state.votes[participantId];
  state.order = state.order.filter((id) => id !== participantId);
  if (state.facilitatorId === participantId && state.order.length > 0) {
    state.facilitatorId = state.order[0];
  }
}

export function applyPokerAction(state: PokerState, actorId: string, action: PokerAction, ctx: Ctx): PokerState {
  if (!state.participants[actorId]) throw new RoomError("You are no longer in this room.", 403);
  const next = structuredClone(state);

  switch (action.type) {
    case "vote": {
      if (next.revealed) throw new RoomError("Cards are already revealed. Ask the facilitator to vote again.", 409);
      if (next.participants[actorId].role === "observer") throw new RoomError("Observers don't vote.", 403);
      if (action.value === null) {
        delete next.votes[actorId];
      } else {
        if (!next.deck.includes(action.value)) throw new RoomError("That card isn't in this deck.");
        next.votes[actorId] = action.value;
      }
      return next;
    }
    case "reveal":
      requireFacilitator(next, actorId);
      next.revealed = true;
      return next;
    case "reset":
      requireFacilitator(next, actorId);
      clearRound(next);
      return next;
    case "addStories": {
      requireFacilitator(next, actorId);
      if (!Array.isArray(action.titles)) throw new RoomError("Enter at least one story.");
      const titles = action.titles
        .filter((t) => typeof t === "string" && t.trim())
        .map((t) => cleanText(t, LIMITS.storyTitle, "story title"));
      if (titles.length === 0) throw new RoomError("Enter at least one story.");
      if (next.stories.length + titles.length > LIMITS.stories) {
        throw new RoomError(`A room holds at most ${LIMITS.stories} stories.`);
      }
      for (const title of titles) next.stories.push({ id: ctx.newId(), title, estimate: null });
      if (!next.currentStoryId) next.currentStoryId = next.stories.find((s) => !s.estimate)?.id ?? null;
      return next;
    }
    case "removeStory":
      requireFacilitator(next, actorId);
      next.stories = next.stories.filter((s) => s.id !== action.storyId);
      if (next.currentStoryId === action.storyId) {
        next.currentStoryId = next.stories.find((s) => !s.estimate)?.id ?? null;
        clearRound(next);
      }
      return next;
    case "selectStory":
      requireFacilitator(next, actorId);
      if (action.storyId !== null && !next.stories.some((s) => s.id === action.storyId)) {
        throw new RoomError("That story is no longer in the list.", 404);
      }
      next.currentStoryId = action.storyId;
      clearRound(next);
      return next;
    case "saveEstimate": {
      requireFacilitator(next, actorId);
      const value = cleanText(action.value, LIMITS.cardLabel * 2, "estimate");
      const story = next.stories.find((s) => s.id === next.currentStoryId);
      if (!story) throw new RoomError("Pick a story before saving an estimate.");
      story.estimate = value;
      const idx = next.stories.indexOf(story);
      const after = next.stories.slice(idx + 1).concat(next.stories.slice(0, idx));
      next.currentStoryId = after.find((s) => !s.estimate)?.id ?? null;
      clearRound(next);
      return next;
    }
    case "setDeck": {
      requireFacilitator(next, actorId);
      const { deckId, deck } = resolveDeck(action.deckId, action.cards);
      next.deckId = deckId;
      next.deck = deck;
      clearRound(next);
      return next;
    }
    case "setRole":
      next.participants[actorId].role = action.role === "observer" ? "observer" : "voter";
      if (action.role === "observer") delete next.votes[actorId];
      return next;
    case "rename":
      next.participants[actorId].name = cleanText(action.name, LIMITS.name, "name");
      return next;
    case "makeFacilitator":
      requireFacilitator(next, actorId);
      if (!next.participants[action.participantId]) throw new RoomError("That person has left.", 404);
      next.facilitatorId = action.participantId;
      return next;
    case "removeParticipant":
      requireFacilitator(next, actorId);
      if (action.participantId === actorId) throw new RoomError("Use Leave room to remove yourself.");
      removeFromRoom(next, action.participantId);
      return next;
    case "leave":
      removeFromRoom(next, actorId);
      return next;
    default:
      throw new RoomError("Unknown action.");
  }
}

export interface PokerStats {
  average: number | null;
  counts: { value: string; count: number }[];
  consensus: boolean;
  suggested: string | null;
}

export function pokerStats(deck: string[], votes: string[]): PokerStats {
  const counted = votes.filter((v) => v !== "Pass");
  const tally = new Map<string, number>();
  for (const v of counted) tally.set(v, (tally.get(v) ?? 0) + 1);
  const counts = deck.filter((c) => tally.has(c)).map((value) => ({ value, count: tally.get(value)! }));
  const numeric = counted.map(Number).filter((n) => Number.isFinite(n));
  const average = numeric.length ? Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 10) / 10 : null;
  // Most common card; on a tie, the larger one, so estimates err on the safe side.
  let suggested: string | null = null;
  for (const { value, count } of counts) {
    if (value === "?") continue;
    if (suggested === null || count >= tally.get(suggested)!) suggested = value;
  }
  return { average, counts, consensus: counts.length === 1 && counts[0].value !== "?", suggested };
}

export interface PokerView {
  kind: "poker";
  name: string;
  deckId: DeckId;
  deck: string[];
  participants: {
    id: string;
    name: string;
    role: Role;
    isFacilitator: boolean;
    hasVoted: boolean;
    vote: string | null;
    online: boolean;
  }[];
  stories: Story[];
  currentStoryId: string | null;
  revealed: boolean;
  me: { id: string; name: string; role: Role; isFacilitator: boolean; vote: string | null } | null;
  stats: PokerStats | null;
}

export const ONLINE_WINDOW_MS = 45_000;

// What a browser may see. Votes stay hidden until the facilitator reveals.
export function pokerView(
  state: PokerState,
  viewerId: string | null,
  presence: Record<string, number>,
  now: number,
): PokerView {
  const me = viewerId ? state.participants[viewerId] : undefined;
  return {
    kind: "poker",
    name: state.name,
    deckId: state.deckId,
    deck: state.deck,
    participants: state.order
      .map((id) => state.participants[id])
      .filter(Boolean)
      .map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        isFacilitator: p.id === state.facilitatorId,
        hasVoted: p.id in state.votes,
        vote: state.revealed ? (state.votes[p.id] ?? null) : null,
        online: p.id === viewerId || now - (presence[p.id] ?? 0) < ONLINE_WINDOW_MS,
      })),
    stories: state.stories,
    currentStoryId: state.currentStoryId,
    revealed: state.revealed,
    me: me
      ? {
          id: me.id,
          name: me.name,
          role: me.role,
          isFacilitator: me.id === state.facilitatorId,
          vote: state.votes[me.id] ?? null,
        }
      : null,
    stats: state.revealed ? pokerStats(state.deck, Object.values(state.votes)) : null,
  };
}
