"use client";

import Link from "next/link";
import { useState } from "react";
import { DECKS, type DeckId, type PokerView } from "@/lib/poker";
import { useRoom, type ConnectionMode } from "@/lib/useRoom";
import { Logo } from "./Logo";

type Act = ReturnType<typeof useRoom>["act"];

export function PokerRoom({ code }: { code: string }) {
  const { status, room, error, setError, mode, join, act } = useRoom(code);

  if (status === "loading") {
    return <Shell code={code} mode={mode}><p className="p-8 text-ink-2" role="status">Opening room…</p></Shell>;
  }
  if (status === "missing") {
    return (
      <Shell code={code} mode={mode}>
        <div className="card mx-auto mt-16 flex max-w-lg flex-col gap-4 p-8">
          <h1 className="text-2xl font-semibold">This room doesn&apos;t exist</h1>
          <p className="text-ink-2">Check the code, or the room may have been deleted. Rooms are deleted 24 hours after their last use.</p>
          <Link href="/#start" className="btn btn-primary self-start">Start a new room</Link>
        </div>
      </Shell>
    );
  }
  if (status === "join" || !room?.me) {
    return (
      <Shell code={code} mode={mode} roomName={room?.name}>
        <JoinForm room={room} error={error} onJoin={join} />
      </Shell>
    );
  }
  return (
    <Shell code={code} mode={mode} roomName={room.name} people={room.participants.length} onLeave={() => act({ type: "leave" })}>
      {error && (
        <div role="alert" className="container-page mt-6">
          <p className="flex items-center justify-between gap-4 rounded-md border border-danger-700/25 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error}
            <button className="btn btn-ghost h-8 px-2 text-sm" onClick={() => setError(null)}>Dismiss</button>
          </p>
        </div>
      )}
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

function Shell(props: {
  code: string;
  mode: ConnectionMode;
  roomName?: string;
  people?: number;
  onLeave?: () => void;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link", window.location.href);
    }
  }
  return (
    <div className="flex min-h-screen flex-col bg-subtle">
      <header className="border-b border-line bg-canvas">
        <div className="container-page flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
          <Logo size={28} />
          <div className="flex min-w-0 flex-[1_1_220px] flex-col">
            <span className="truncate font-display text-lg font-semibold">{props.roomName ?? "Planning poker"}</span>
            <span className="text-[13px] text-muted">
              Room <span className="font-mono text-ink-2">{props.code}</span>
              {props.people !== undefined && <> · {props.people} {props.people === 1 ? "person" : "people"}</>}
            </span>
          </div>
          <ModeBadge mode={props.mode} />
          <button className="btn btn-secondary" onClick={copy}>
            <CopyIcon />
            <span aria-live="polite">{copied ? "Link copied" : "Copy invite link"}</span>
          </button>
          {props.onLeave && (
            <button className="btn btn-ghost" onClick={props.onLeave}>Leave</button>
          )}
        </div>
      </header>
      <main id="main" className="flex-1">{props.children}</main>
    </div>
  );
}

function ModeBadge({ mode }: { mode: ConnectionMode }) {
  const map: Record<ConnectionMode, { text: string; cls: string; title: string }> = {
    live: { text: "Live", cls: "bg-green-50 text-green-700", title: "Updates arrive instantly." },
    compatible: {
      text: "Live, compatibility mode",
      cls: "bg-teal-50 text-teal-700",
      title: "Your network blocks instant updates, so the room checks for changes every 1.5 seconds.",
    },
    connecting: { text: "Connecting…", cls: "bg-navy-50 text-navy-700", title: "Connecting to the room." },
    offline: { text: "Reconnecting…", cls: "bg-danger-50 text-danger-700", title: "Can't reach QuickPoker. Retrying." },
  };
  const m = map[mode];
  return (
    <span role="status" title={m.title} className={`inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-[13px] font-medium ${m.cls}`}>
      {mode === "live" && <CheckIcon />}
      {m.text}
    </span>
  );
}

function JoinForm({ room, error, onJoin }: { room: PokerView | null; error: string | null; onJoin: (name: string, role: "voter" | "observer") => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [observer, setObserver] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card mx-auto mt-16 flex w-[calc(100%-2.5rem)] max-w-md flex-col gap-4 p-8 shadow-[var(--shadow-panel)]"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onJoin(name, observer ? "observer" : "voter");
        setBusy(false);
      }}
    >
      <p className="t-eyebrow">Join the room</p>
      <h1 className="text-2xl font-semibold">{room?.name ?? "Planning poker"}</h1>
      {room && <p className="text-sm text-ink-2">{room.participants.length} {room.participants.length === 1 ? "person is" : "people are"} here.</p>}
      {error && <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="join-name" className="text-sm font-medium">Your name</label>
        <input id="join-name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoFocus autoComplete="nickname" />
      </div>
      <label className="flex items-center gap-3 text-[15px]">
        <input type="checkbox" className="h-5 w-5 accent-navy-700" checked={observer} onChange={(e) => setObserver(e.target.checked)} />
        Join as an observer (watch without voting)
      </label>
      <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !name.trim()}>
        {busy ? "Joining…" : "Join room"}
      </button>
    </form>
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

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" />
    </svg>
  );
}
