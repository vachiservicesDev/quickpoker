// Retrospective board logic. Pure functions over a JSON state document, like
// poker.ts, so the same code runs against Supabase and the in-memory store.

import { cleanText, RoomError, type Ctx, type Participant } from "./poker";

export const TEMPLATES = {
  classic: {
    label: "Went well, To improve, Try next",
    columns: [
      { id: "well", title: "Went well" },
      { id: "improve", title: "To improve" },
      { id: "try", title: "Try next" },
    ],
  },
  ssc: {
    label: "Start, Stop, Continue",
    columns: [
      { id: "start", title: "Start" },
      { id: "stop", title: "Stop" },
      { id: "continue", title: "Continue" },
    ],
  },
  msg: {
    label: "Mad, Sad, Glad",
    columns: [
      { id: "mad", title: "Mad" },
      { id: "sad", title: "Sad" },
      { id: "glad", title: "Glad" },
    ],
  },
  fourls: {
    label: "Liked, Learned, Lacked, Longed for",
    columns: [
      { id: "liked", title: "Liked" },
      { id: "learned", title: "Learned" },
      { id: "lacked", title: "Lacked" },
      { id: "longed", title: "Longed for" },
    ],
  },
} as const;

export type TemplateId = keyof typeof TEMPLATES;
export type Phase = "write" | "vote" | "discuss";
export const PHASES: { id: Phase; label: string }[] = [
  { id: "write", label: "Write" },
  { id: "vote", label: "Vote" },
  { id: "discuss", label: "Discuss" },
];

export const RETRO_LIMITS = {
  name: 40,
  roomName: 80,
  participants: 100,
  cardText: 300,
  cards: 600,
  cardsPerPerson: 60,
  actionText: 200,
  actions: 60,
  minVotes: 1,
  maxVotes: 10,
  maxTimerMinutes: 60,
};

export interface RetroCard {
  id: string;
  columnId: string;
  authorId: string;
  text: string;
  voters: string[]; // one entry per vote, so a person can put several votes on one card
  createdAt: number;
}

export interface ActionItem {
  id: string;
  text: string;
  owner: string | null;
  done: boolean;
  authorId: string;
}

export interface RetroState {
  kind: "retro";
  name: string;
  templateId: TemplateId;
  columns: { id: string; title: string }[];
  facilitatorId: string;
  participants: Record<string, Participant>;
  order: string[];
  phase: Phase;
  votesPerPerson: number;
  cards: RetroCard[];
  actions: ActionItem[];
  timer: { endsAt: number | null; minutes: number };
}

export type RetroAction =
  | { type: "addCard"; columnId: string; text: string }
  | { type: "editCard"; cardId: string; text: string }
  | { type: "deleteCard"; cardId: string }
  | { type: "vote"; cardId: string }
  | { type: "unvote"; cardId: string }
  | { type: "setPhase"; phase: Phase }
  | { type: "setVotes"; votesPerPerson: number }
  | { type: "startTimer"; minutes: number }
  | { type: "stopTimer" }
  | { type: "addAction"; text: string; owner?: string | null }
  | { type: "toggleAction"; actionId: string }
  | { type: "deleteAction"; actionId: string }
  | { type: "rename"; name: string }
  | { type: "makeFacilitator"; participantId: string }
  | { type: "removeParticipant"; participantId: string }
  | { type: "leave" };

function clampVotes(value: unknown): number {
  const n = typeof value === "number" ? Math.round(value) : Number(value);
  if (!Number.isFinite(n)) return 3;
  return Math.min(RETRO_LIMITS.maxVotes, Math.max(RETRO_LIMITS.minVotes, n));
}

export function createRetroRoom(
  input: { roomName?: unknown; facilitatorName: unknown; templateId?: unknown; votesPerPerson?: unknown },
  facilitator: { id: string; secretHash: string },
  ctx: Ctx,
): RetroState {
  const templateId: TemplateId =
    typeof input.templateId === "string" && input.templateId in TEMPLATES ? (input.templateId as TemplateId) : "classic";
  const name =
    typeof input.roomName === "string" && input.roomName.trim()
      ? cleanText(input.roomName, RETRO_LIMITS.roomName, "room name")
      : "Sprint retrospective";
  return {
    kind: "retro",
    name,
    templateId,
    columns: TEMPLATES[templateId].columns.map((c) => ({ ...c })),
    facilitatorId: facilitator.id,
    participants: {
      [facilitator.id]: {
        id: facilitator.id,
        name: cleanText(input.facilitatorName, RETRO_LIMITS.name, "name"),
        role: "voter",
        secretHash: facilitator.secretHash,
        joinedAt: ctx.now,
      },
    },
    order: [facilitator.id],
    phase: "write",
    votesPerPerson: input.votesPerPerson === undefined ? 3 : clampVotes(input.votesPerPerson),
    cards: [],
    actions: [],
    timer: { endsAt: null, minutes: 5 },
  };
}

export function joinRetroRoom(
  state: RetroState,
  input: { name: unknown },
  participant: { id: string; secretHash: string },
  ctx: Ctx,
): RetroState {
  if (state.order.length >= RETRO_LIMITS.participants) {
    throw new RoomError(`This room is full (${RETRO_LIMITS.participants} people).`, 409);
  }
  const next = structuredClone(state);
  next.participants[participant.id] = {
    id: participant.id,
    name: cleanText(input.name, RETRO_LIMITS.name, "name"),
    role: "voter",
    secretHash: participant.secretHash,
    joinedAt: ctx.now,
  };
  next.order.push(participant.id);
  return next;
}

function requireFacilitator(state: RetroState, actorId: string) {
  if (state.facilitatorId !== actorId) throw new RoomError("Only the facilitator can do that.", 403);
}

function findCard(state: RetroState, cardId: string) {
  const card = state.cards.find((c) => c.id === cardId);
  if (!card) throw new RoomError("That card was deleted.", 404);
  return card;
}

function votesUsed(state: RetroState, participantId: string) {
  let used = 0;
  for (const c of state.cards) for (const v of c.voters) if (v === participantId) used++;
  return used;
}

export function applyRetroAction(state: RetroState, actorId: string, action: RetroAction, ctx: Ctx): RetroState {
  if (!state.participants[actorId]) throw new RoomError("You are no longer in this room.", 403);
  const next = structuredClone(state);
  const isFac = next.facilitatorId === actorId;

  switch (action.type) {
    case "addCard": {
      if (next.phase !== "write") throw new RoomError("Writing is closed. Ask the facilitator to go back to Write.", 409);
      if (!next.columns.some((c) => c.id === action.columnId)) throw new RoomError("That column doesn't exist.");
      if (next.cards.length >= RETRO_LIMITS.cards) throw new RoomError(`A board holds at most ${RETRO_LIMITS.cards} cards.`);
      if (next.cards.filter((c) => c.authorId === actorId).length >= RETRO_LIMITS.cardsPerPerson) {
        throw new RoomError(`You can add up to ${RETRO_LIMITS.cardsPerPerson} cards.`);
      }
      next.cards.push({
        id: ctx.newId(),
        columnId: action.columnId,
        authorId: actorId,
        text: cleanText(action.text, RETRO_LIMITS.cardText, "card"),
        voters: [],
        createdAt: ctx.now,
      });
      return next;
    }
    case "editCard": {
      const card = findCard(next, action.cardId);
      if (card.authorId !== actorId) throw new RoomError("You can only edit your own cards.", 403);
      if (next.phase === "discuss") throw new RoomError("Cards are locked during discussion.", 409);
      card.text = cleanText(action.text, RETRO_LIMITS.cardText, "card");
      return next;
    }
    case "deleteCard": {
      const card = findCard(next, action.cardId);
      if (card.authorId !== actorId && !isFac) throw new RoomError("You can only delete your own cards.", 403);
      next.cards = next.cards.filter((c) => c.id !== card.id);
      return next;
    }
    case "vote": {
      if (next.phase !== "vote") throw new RoomError("Voting isn't open.", 409);
      const card = findCard(next, action.cardId);
      if (votesUsed(next, actorId) >= next.votesPerPerson) {
        throw new RoomError(`You've used all ${next.votesPerPerson} votes. Remove one to vote again.`, 409);
      }
      card.voters.push(actorId);
      return next;
    }
    case "unvote": {
      if (next.phase !== "vote") throw new RoomError("Voting isn't open.", 409);
      const card = findCard(next, action.cardId);
      const i = card.voters.indexOf(actorId);
      if (i >= 0) card.voters.splice(i, 1);
      return next;
    }
    case "setPhase":
      requireFacilitator(next, actorId);
      if (!PHASES.some((p) => p.id === action.phase)) throw new RoomError("Unknown step.");
      next.phase = action.phase;
      return next;
    case "setVotes": {
      requireFacilitator(next, actorId);
      next.votesPerPerson = clampVotes(action.votesPerPerson);
      // If the allowance shrank, drop each person's most recent extra votes.
      const used = new Map<string, number>();
      for (const card of next.cards) {
        card.voters = card.voters.filter((v) => {
          const n = (used.get(v) ?? 0) + 1;
          used.set(v, n);
          return n <= next.votesPerPerson;
        });
      }
      return next;
    }
    case "startTimer": {
      requireFacilitator(next, actorId);
      const minutes = Number(action.minutes);
      if (!Number.isFinite(minutes) || minutes <= 0 || minutes > RETRO_LIMITS.maxTimerMinutes) {
        throw new RoomError(`Set a timer between 1 and ${RETRO_LIMITS.maxTimerMinutes} minutes.`);
      }
      next.timer = { endsAt: ctx.now + Math.round(minutes * 60_000), minutes };
      return next;
    }
    case "stopTimer":
      requireFacilitator(next, actorId);
      next.timer.endsAt = null;
      return next;
    case "addAction": {
      if (next.actions.length >= RETRO_LIMITS.actions) throw new RoomError(`A board holds at most ${RETRO_LIMITS.actions} action items.`);
      const owner =
        typeof action.owner === "string" && action.owner.trim() ? cleanText(action.owner, RETRO_LIMITS.name, "owner") : null;
      next.actions.push({ id: ctx.newId(), text: cleanText(action.text, RETRO_LIMITS.actionText, "action item"), owner, done: false, authorId: actorId });
      return next;
    }
    case "toggleAction": {
      const item = next.actions.find((a) => a.id === action.actionId);
      if (!item) throw new RoomError("That action item was deleted.", 404);
      item.done = !item.done;
      return next;
    }
    case "deleteAction": {
      const item = next.actions.find((a) => a.id === action.actionId);
      if (!item) throw new RoomError("That action item was deleted.", 404);
      if (item.authorId !== actorId && !isFac) throw new RoomError("Only the person who added it or the facilitator can delete it.", 403);
      next.actions = next.actions.filter((a) => a.id !== item.id);
      return next;
    }
    case "rename":
      next.participants[actorId].name = cleanText(action.name, RETRO_LIMITS.name, "name");
      return next;
    case "makeFacilitator":
      requireFacilitator(next, actorId);
      if (!next.participants[action.participantId]) throw new RoomError("That person has left.", 404);
      next.facilitatorId = action.participantId;
      return next;
    case "removeParticipant":
      requireFacilitator(next, actorId);
      if (action.participantId === actorId) throw new RoomError("Use Leave room to remove yourself.");
      removeFromRetro(next, action.participantId);
      return next;
    case "leave":
      removeFromRetro(next, actorId);
      return next;
    default:
      throw new RoomError("Unknown action.");
  }
}

// Cards stay on the board when their author leaves; only their seat and votes go.
function removeFromRetro(state: RetroState, participantId: string) {
  delete state.participants[participantId];
  state.order = state.order.filter((id) => id !== participantId);
  for (const card of state.cards) card.voters = card.voters.filter((v) => v !== participantId);
  if (state.facilitatorId === participantId && state.order.length > 0) state.facilitatorId = state.order[0];
}

export interface RetroCardView {
  id: string;
  columnId: string;
  mine: boolean;
  /** Null while other people's cards are hidden during the Write step. */
  text: string | null;
  /** Total votes, shown once the board moves to Discuss. */
  votes: number | null;
  myVotes: number;
}

export interface RetroView {
  kind: "retro";
  name: string;
  templateId: TemplateId;
  columns: { id: string; title: string }[];
  phase: Phase;
  votesPerPerson: number;
  participants: { id: string; name: string; isFacilitator: boolean; online: boolean; cards: number; votesUsed: number }[];
  cards: RetroCardView[];
  actions: { id: string; text: string; owner: string | null; done: boolean; mine: boolean }[];
  timer: { endsAt: number | null; minutes: number };
  serverNow: number;
  me: { id: string; name: string; isFacilitator: boolean; votesLeft: number } | null;
}

// What a browser may see. Cards are anonymous: authors are never sent, and
// during Write each person sees only their own text. Vote totals wait for Discuss.
export function retroView(state: RetroState, viewerId: string | null, presence: Record<string, number>, now: number): RetroView {
  const me = viewerId ? state.participants[viewerId] : undefined;
  const ONLINE_WINDOW_MS = 45_000;
  return {
    kind: "retro",
    name: state.name,
    templateId: state.templateId,
    columns: state.columns,
    phase: state.phase,
    votesPerPerson: state.votesPerPerson,
    participants: state.order
      .map((id) => state.participants[id])
      .filter(Boolean)
      .map((p) => ({
        id: p.id,
        name: p.name,
        isFacilitator: p.id === state.facilitatorId,
        online: p.id === viewerId || now - (presence[p.id] ?? 0) < ONLINE_WINDOW_MS,
        cards: state.cards.filter((c) => c.authorId === p.id).length,
        votesUsed: votesUsed(state, p.id),
      })),
    cards: state.cards.map((c) => {
      const mine = c.authorId === viewerId;
      return {
        id: c.id,
        columnId: c.columnId,
        mine,
        text: state.phase === "write" && !mine ? null : c.text,
        votes: state.phase === "discuss" ? c.voters.length : null,
        myVotes: viewerId ? c.voters.filter((v) => v === viewerId).length : 0,
      };
    }),
    actions: state.actions.map((a) => ({ id: a.id, text: a.text, owner: a.owner, done: a.done, mine: a.authorId === viewerId })),
    timer: state.timer,
    serverNow: now,
    me: me
      ? {
          id: me.id,
          name: me.name,
          isFacilitator: me.id === state.facilitatorId,
          votesLeft: Math.max(0, state.votesPerPerson - votesUsed(state, me.id)),
        }
      : null,
  };
}

/** Plain-text summary for email and the clipboard. */
export function retroSummary(view: RetroView, url: string): string {
  const lines: string[] = [`${view.name}`, `QuickPoker retrospective, ${new Date(view.serverNow).toLocaleDateString()}`, ""];
  for (const col of view.columns) {
    const cards = view.cards
      .filter((c) => c.columnId === col.id && c.text !== null)
      .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
    lines.push(`${col.title.toUpperCase()} (${cards.length})`);
    for (const c of cards) lines.push(`- ${c.text}${c.votes ? ` [${c.votes} ${c.votes === 1 ? "vote" : "votes"}]` : ""}`);
    lines.push("");
  }
  lines.push(`ACTION ITEMS (${view.actions.length})`);
  for (const a of view.actions) lines.push(`- [${a.done ? "x" : " "}] ${a.text}${a.owner ? ` (owner: ${a.owner})` : ""}`);
  lines.push("", `Participants: ${view.participants.map((p) => p.name).join(", ")}`, `Board: ${url}`);
  return lines.join("\n");
}
