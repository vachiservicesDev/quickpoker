"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DECKS, type DeckId, type PokerAction, type PokerView } from "@/lib/poker";
import { useRoom } from "@/lib/useRoom";
import { CheckIcon, ErrorBanner, JoinForm, MissingRoom, Shell } from "./RoomChrome";

type Act = (action: PokerAction) => Promise<boolean>;
const TITLE = "Planning poker";

export function PokerRoom({ code }: { code: string }) {
  const { status, room, error, setError, mode, join, act } = useRoom<PokerView, PokerAction>(code);
  const router = useRouter();
  const wrongKind = (room?.kind as string | undefined) === "retro";
  useEffect(() => {
    if (wrongKind) router.replace(`/r/${code}`);
  }, [wrongKind, code, router]);

  if (status === "loading") {
    return <Shell code={code} mode={mode} fallbackTitle={TITLE}><p className="p-8 text-ink-2" role="status">Opening room…</p></Shell>;
  }
  if (status === "missing") {
    return <Shell code={code} mode={mode} fallbackTitle={TITLE}><MissingRoom /></Shell>;
  }
  if (wrongKind) {
    return <Shell code={code} mode={mode} fallbackTitle={TITLE}><p className="p-8 text-ink-2" role="status">Opening retro board…</p></Shell>;
  }
  if (status === "join" || !room?.me) {
    return (
      <Shell code={code} mode={mode} roomName={room?.name} fallbackTitle={TITLE}>
        <JoinForm room={room} error={error} onJoin={join} fallbackTitle={TITLE} allowObserver />
      </Shell>
    );
  }
  return (
    <Shell code={code} mode={mode} roomName={room.name} fallbackTitle={TITLE} people={room.participants.length} onLeave={() => act({ type: "leave" })}>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      <div className="container-page flex flex-wrap items-start gap-8 py-8">
        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-6 lg:max-w-[340px]">
          <Stories room={room} act={act} />
          <People room={room} act={act} />
        </aside>
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
          <Table room={room} act={act} />
          {room.revealed && room.stats && <Results room={room} act={act} />}
          <Deck room={room} act={act} />
        </div>
      </div>
    </Shell>
  );
}

function Stories({ room, act }: { room: PokerView; act: Act }) {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const fac = room.me?.isFacilitator;
  const done = room.stories.filter((s) => s.estimate).length;

  function exportCsv() {
    const rows = [["Story", "Estimate"], ...room.stories.map((s) => [s.title, s.estimate ?? ""])];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${room.name.replace(/[^\w-]+/g, "-")}-estimates.csv`;
    a.click();
  }

  return (
    <section aria-labelledby="stories-h" className="card flex flex-col gap-4 p-6">
      <div className="flex items-baseline justify-between">
        <h2 id="stories-h" className="text-lg font-semibold">Stories</h2>
        <span className="t-label">{done} of {room.stories.length} done</span>
      </div>
      {room.stories.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong p-4 text-sm text-ink-2">
          {fac ? "Add the stories you want to estimate, or just vote without one." : "The facilitator hasn't added stories yet."}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {room.stories.map((s) => {
            const current = s.id === room.currentStoryId;
            return (
              <li key={s.id} className={`group flex items-center gap-2 rounded-md border text-sm ${current ? "border-navy-700 bg-navy-50 text-navy-700" : "border-line text-ink-2"}`}>
                <button
                  className="flex min-h-11 flex-1 items-center justify-between gap-3 px-3 py-2 text-left disabled:cursor-default"
                  disabled={!fac || current}
                  onClick={() => act({ type: "selectStory", storyId: s.id })}
                  aria-current={current ? "true" : undefined}
                >
                  <span className={current ? "font-medium" : ""}>{s.title}</span>
                  {current ? (
                    <span className="t-label !text-navy-700">Voting</span>
                  ) : (
                    <span className="font-display font-semibold text-ink">{s.estimate ?? "–"}</span>
                  )}
                </button>
                {fac && (
                  <button className="mr-1 h-9 w-9 shrink-0 rounded-md text-muted hover:bg-danger-50 hover:text-danger-700" aria-label={`Remove story: ${s.title}`} onClick={() => act({ type: "removeStory", storyId: s.id })}>
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {fac && (adding ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const titles = draft.split("\n").map((t) => t.trim()).filter(Boolean);
            if (await act({ type: "addStories", titles })) {
              setDraft("");
              setAdding(false);
            }
          }}
        >
          <label htmlFor="new-stories" className="text-sm font-medium">One story per line</label>
          <textarea id="new-stories" className="field min-h-28" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={!draft.trim()}>Add stories</button>
            <button type="button" className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn btn-secondary" onClick={() => setAdding(true)}>Add stories</button>
      ))}
      {room.stories.some((s) => s.estimate) && (
        <button className="btn btn-ghost" onClick={exportCsv}>Download estimates as CSV</button>
      )}
    </section>
  );
}

function People({ room, act }: { room: PokerView; act: Act }) {
  const me = room.me!;
  return (
    <section aria-labelledby="people-h" className="card flex flex-col gap-3 p-6">
      <h2 id="people-h" className="text-lg font-semibold">People</h2>
      <ul className="flex flex-col gap-1">
        {room.participants.map((p) => (
          <li key={p.id} className="flex min-h-10 items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${p.online ? "bg-green-700" : "bg-line-strong"}`} />
              <span className={p.id === me.id ? "font-semibold" : ""}>{p.name}{p.id === me.id ? " (you)" : ""}</span>
              <span className="sr-only">{p.online ? "online" : "away"}</span>
              {p.isFacilitator && <span className="t-label">Facilitator</span>}
              {p.role === "observer" && <span className="t-label">Observer</span>}
            </span>
            {me.isFacilitator && p.id !== me.id && (
              <span className="flex gap-1">
                <button className="btn btn-ghost h-8 px-2 text-[13px]" onClick={() => act({ type: "makeFacilitator", participantId: p.id })}>Make facilitator</button>
                <button className="btn btn-ghost h-8 px-2 text-[13px]" onClick={() => act({ type: "removeParticipant", participantId: p.id })}>Remove</button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <button className="btn btn-secondary" onClick={() => act({ type: "setRole", role: me.role === "observer" ? "voter" : "observer" })}>
        {me.role === "observer" ? "Start voting" : "Switch to observer"}
      </button>
    </section>
  );
}

function Table({ room, act }: { room: PokerView; act: Act }) {
  const story = room.stories.find((s) => s.id === room.currentStoryId);
  const idx = story ? room.stories.indexOf(story) : -1;
  const voters = room.participants.filter((p) => p.role === "voter");
  const voted = voters.filter((p) => p.hasVoted).length;
  const fac = room.me?.isFacilitator;
  return (
    <section aria-labelledby="story-h" className="card flex flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="t-eyebrow">{story ? `Story ${idx + 1} of ${room.stories.length}` : "Free vote"}</p>
          <h1 id="story-h" className="text-[28px] font-bold leading-tight tracking-tight md:text-[32px]">
            {story?.title ?? "No story selected"}
          </h1>
          <p className="text-sm text-ink-2" aria-live="polite">{voted} of {voters.length} voted</p>
        </div>
        {fac && (
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => act({ type: "reset" })}>Vote again</button>
            {!room.revealed && (
              <button className="btn btn-primary" onClick={() => act({ type: "reveal" })} disabled={voted === 0}>Reveal cards</button>
            )}
          </div>
        )}
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-4">
        {voters.map((p) => (
          <li key={p.id} className="flex flex-col items-center gap-2 text-center">
            <PlayerCard revealed={room.revealed} hasVoted={p.hasVoted} vote={p.vote} />
            <span className="max-w-full truncate text-sm font-medium">{p.name}</span>
            <span className="text-xs text-muted">{p.hasVoted ? "Voted" : room.revealed ? "Didn't vote" : "Thinking"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlayerCard({ revealed, hasVoted, vote }: { revealed: boolean; hasVoted: boolean; vote: string | null }) {
  const base = "flex h-[100px] w-[72px] items-center justify-center rounded-md font-display font-bold transition-colors";
  if (!hasVoted) return <div className={`${base} border border-dashed border-line-strong bg-subtle text-sm text-muted`} aria-hidden="true">…</div>;
  if (!revealed) return <div className={`${base} border-2 border-ink bg-ink text-navy-100`} aria-label="Card hidden"><CheckIcon size={20} /></div>;
  return <div className={`${base} border-2 border-ink bg-canvas ${(vote ?? "").length > 2 ? "text-base" : "text-[28px]"} text-ink`}>{vote}</div>;
}

function Results({ room, act }: { room: PokerView; act: Act }) {
  const stats = room.stats!;
  const [value, setValue] = useState(stats.suggested ?? "");
  const max = Math.max(1, ...stats.counts.map((c) => c.count));
  const story = room.stories.find((s) => s.id === room.currentStoryId);
  const spread = stats.counts.length;
  return (
    <section aria-label="Results" className="card flex flex-wrap gap-8 p-6 md:p-8">
      <div className="flex min-w-[180px] flex-[1_1_180px] flex-col gap-1">
        <span className="t-label">{stats.average !== null ? "Average" : "Most votes"}</span>
        <span className="font-display text-5xl font-bold leading-none text-navy-700">{stats.average ?? stats.suggested ?? "–"}</span>
        <span className="text-sm text-ink-2">
          {stats.consensus
            ? "Everyone agreed"
            : spread === 0
              ? "No votes to count"
              : `Votes ranged from ${stats.counts[0].value} to ${stats.counts[spread - 1].value}${spread > 2 ? ": talk it through" : ""}`}
        </span>
      </div>
      <ul className="flex min-w-0 flex-[3_1_320px] flex-col gap-2.5">
        {stats.counts.map((c) => (
          <li key={c.value} className="flex items-center gap-3">
            <span className="w-10 text-right font-display font-semibold">{c.value}</span>
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-navy-50">
              <span className="block h-full rounded-full bg-navy-700" style={{ width: `${(c.count / max) * 100}%` }} />
            </span>
            <span className="w-16 text-sm text-ink-2">{c.count} {c.count === 1 ? "vote" : "votes"}</span>
          </li>
        ))}
      </ul>
      {room.me?.isFacilitator && story && (
        <form
          className="flex min-w-[220px] flex-[1_1_220px] flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            act({ type: "saveEstimate", value });
          }}
        >
          <label htmlFor="final" className="text-sm font-medium">Final estimate</label>
          <div className="flex gap-2">
            <input id="final" className="field w-24 font-display text-lg font-semibold" value={value} onChange={(e) => setValue(e.target.value)} maxLength={12} required />
            <button type="submit" className="btn btn-primary btn-lg flex-1">Save and next</button>
          </div>
        </form>
      )}
    </section>
  );
}

function Deck({ room, act }: { room: PokerView; act: Act }) {
  const me = room.me!;
  const fac = me.isFacilitator;
  if (me.role === "observer") {
    return <p className="card p-6 text-ink-2">You&apos;re observing. Switch to voting in the People panel to pick a card.</p>;
  }
  return (
    <section aria-labelledby="deck-h" className="card flex flex-col gap-4 p-6 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="deck-h" className="text-lg font-semibold">Pick your card</h2>
        {fac ? (
          <label className="flex items-center gap-2 text-sm text-ink-2">
            Deck
            <select
              className="field h-10 w-auto py-0"
              value={room.deckId}
              onChange={(e) => act({ type: "setDeck", deckId: e.target.value as DeckId, cards: room.deckId === "custom" ? room.deck : undefined })}
            >
              {Object.entries(DECKS).map(([id, d]) => <option key={id} value={id}>{d.label}</option>)}
              {room.deckId === "custom" && <option value="custom">Custom</option>}
            </select>
          </label>
        ) : (
          <span className="text-sm text-muted">Votes stay hidden until the facilitator reveals.</span>
        )}
      </div>
      <div className="flex flex-wrap gap-3" role="group" aria-label="Cards">
        {room.deck.map((card) => {
          const on = me.vote === card;
          return (
            <button
              key={card}
              aria-pressed={on}
              disabled={room.revealed}
              onClick={() => act({ type: "vote", value: on ? null : card })}
              className={`h-[88px] w-16 rounded-md font-display font-bold transition-transform duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${card.length > 2 ? "text-base" : "text-2xl"} ${
                on ? "-translate-y-2 border-2 border-navy-700 bg-navy-700 text-white" : "border border-line-strong bg-canvas text-ink hover:-translate-y-1 hover:border-navy-600"
              }`}
            >
              {card}
            </button>
          );
        })}
      </div>
    </section>
  );
}

