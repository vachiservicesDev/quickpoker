"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PHASES, RETRO_LIMITS, retroSummary, type Phase, type RetroAction, type RetroCardView, type RetroView } from "@/lib/retro";
import { useRoom } from "@/lib/useRoom";
import { ErrorBanner, JoinForm, MissingRoom, Shell } from "./RoomChrome";

type Act = (action: RetroAction) => Promise<boolean>;
type Headers = () => HeadersInit;
const TITLE = "Sprint retrospective";

export function RetroRoom({ code }: { code: string }) {
  const { status, room, error, setError, mode, join, act, headers } = useRoom<RetroView, RetroAction>(code);
  const router = useRouter();
  const wrongKind = (room?.kind as string | undefined) === "poker";
  useEffect(() => {
    if (wrongKind) router.replace(`/p/${code}`);
  }, [wrongKind, code, router]);

  if (status === "loading" || wrongKind) {
    return <Shell code={code} mode={mode} fallbackTitle={TITLE}><p className="p-8 text-ink-2" role="status">Opening board…</p></Shell>;
  }
  if (status === "missing") {
    return <Shell code={code} mode={mode} fallbackTitle={TITLE}><MissingRoom /></Shell>;
  }
  if (status === "join" || !room?.me) {
    return (
      <Shell code={code} mode={mode} roomName={room?.name} fallbackTitle={TITLE}>
        <JoinForm room={room} error={error} onJoin={join} fallbackTitle={TITLE} allowObserver={false} />
      </Shell>
    );
  }
  return (
    <Shell code={code} mode={mode} roomName={room.name} fallbackTitle={TITLE} people={room.participants.length} onLeave={() => act({ type: "leave" })}>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      <PrintHeader room={room} />
      <div className="container-page flex flex-col gap-6 py-8 print:py-0">
        <Toolbar code={code} room={room} act={act} headers={headers} />
        <Board room={room} act={act} />
        <div className="flex flex-wrap items-start gap-6">
          <Actions room={room} act={act} />
          <People room={room} act={act} />
        </div>
      </div>
    </Shell>
  );
}

function PrintHeader({ room }: { room: RetroView }) {
  return (
    <div className="hidden print:block print:pb-4">
      <p className="t-eyebrow">QuickPoker retrospective</p>
      <h1 className="text-2xl font-bold">{room.name}</h1>
      <p className="text-sm text-ink-2">
        {new Date(room.serverNow).toLocaleDateString(undefined, { dateStyle: "long" })} · {room.participants.map((p) => p.name).join(", ")}
      </p>
    </div>
  );
}

function Toolbar({ code, room, act, headers }: { code: string; room: RetroView; act: Act; headers: Headers }) {
  const me = room.me!;
  const fac = me.isFacilitator;
  const idx = PHASES.findIndex((p) => p.id === room.phase);
  const hint: Record<Phase, string> = {
    write: "Add cards to any column. Other people's cards stay hidden until the facilitator moves on.",
    vote: `Vote on the cards that matter most. You have ${me.votesLeft} of ${room.votesPerPerson} votes left.`,
    discuss: "Cards are sorted by votes. Talk through the top ones and capture action items below.",
  };
  return (
    <section aria-label="Retro steps" className="card flex flex-wrap items-center justify-between gap-x-8 gap-y-5 p-5 md:px-6 print:hidden">
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3">
        <ol className="flex flex-wrap items-center gap-2">
          {PHASES.map((p, i) => {
            const current = p.id === room.phase;
            const cls = current
              ? "border-navy-700 bg-navy-700 text-white"
              : i < idx
                ? "border-navy-100 bg-navy-50 text-navy-700"
                : "border-line-strong bg-canvas text-ink-2";
            return (
              <li key={p.id} className="flex items-center gap-2">
                {fac && !current ? (
                  <button className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium hover:border-navy-600 ${cls}`} onClick={() => act({ type: "setPhase", phase: p.id })}>
                    <span className="font-mono text-xs">{i + 1}</span> {p.label}
                  </button>
                ) : (
                  <span aria-current={current ? "step" : undefined} className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium ${cls}`}>
                    <span className="font-mono text-xs">{i + 1}</span> {p.label}
                  </span>
                )}
                {i < PHASES.length - 1 && <span aria-hidden="true" className="h-px w-4 bg-line-strong" />}
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-ink-2" aria-live="polite">{hint[room.phase]}</p>
        {fac && room.phase !== "discuss" && (
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" onClick={() => act({ type: "setPhase", phase: PHASES[idx + 1].id })}>
              {room.phase === "write" ? "Reveal cards and start voting" : "Show results and discuss"}
            </button>
            {room.phase === "write" && (
              <label className="flex items-center gap-2 text-sm text-ink-2">
                Votes per person
                <select className="field h-10 w-auto py-0" value={room.votesPerPerson} onChange={(e) => act({ type: "setVotes", votesPerPerson: Number(e.target.value) })}>
                  {Array.from({ length: RETRO_LIMITS.maxVotes }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
          </div>
        )}
      </div>
      <Timer room={room} act={act} />
      {fac && room.phase !== "write" && <Export code={code} room={room} headers={headers} act={act} />}
    </section>
  );
}

function Timer({ room, act }: { room: RetroView; act: Act }) {
  const fac = room.me!.isFacilitator;
  // The countdown uses the server's clock, so a laptop with the wrong time still agrees with the room.
  const offset = useRef(0);
  const [left, setLeft] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(String(room.timer.minutes));
  const beeped = useRef<number | null>(null);
  const endsAt = room.timer.endsAt;

  useEffect(() => {
    offset.current = room.serverNow - Date.now();
  }, [room.serverNow]);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setLeft(Math.max(0, endsAt - (Date.now() + offset.current)));
    const first = setTimeout(tick, 0);
    const every = setInterval(tick, 250);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [endsAt]);

  const remaining = endsAt ? left : null;
  const up = remaining === 0;

  useEffect(() => {
    if (!up || !endsAt || beeped.current === endsAt) return;
    beeped.current = endsAt;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Sound is a nicety; the display already says time is up.
    }
  }, [up, endsAt]);

  const mm = remaining !== null ? Math.floor(Math.ceil(remaining / 1000) / 60) : 0;
  const ss = remaining !== null ? Math.ceil(remaining / 1000) % 60 : 0;

  return (
    <div className="flex flex-col gap-2">
      <span className="t-label">Timer</span>
      <div className="flex flex-wrap items-center gap-3">
        <span
          role="timer"
          aria-live={up ? "assertive" : "off"}
          className={`min-w-[5.5rem] font-mono text-[32px] font-semibold leading-none tabular-nums ${up ? "text-danger-700" : endsAt ? "text-navy-700" : "text-muted"}`}
        >
          {remaining === null ? "--:--" : up ? "Time's up" : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`}
        </span>
        {fac &&
          (endsAt ? (
            <button className="btn btn-secondary" onClick={() => act({ type: "stopTimer" })}>Stop</button>
          ) : (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                act({ type: "startTimer", minutes: Number(minutes) });
              }}
            >
              <label className="sr-only" htmlFor="timer-min">Minutes</label>
              <select id="timer-min" className="field h-11 w-auto py-0" value={minutes} onChange={(e) => setMinutes(e.target.value)}>
                {[1, 2, 3, 5, 7, 10, 15, 20, 30].map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
              <button type="submit" className="btn btn-secondary">Start</button>
            </form>
          ))}
      </div>
    </div>
  );
}

function Export({ code, room, headers, act }: { code: string; room: RetroView; headers: Headers; act: Act }) {
  const [note, setNote] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [sending, setSending] = useState(false);

  function flash(text: string) {
    setNote(text);
    setTimeout(() => setNote(null), 4000);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  // Sends the summary from QuickPoker. Until email is set up on the server,
  // falls back to opening the facilitator's own mail app.
  async function emailMe(e: { preventDefault(): void }) {
    e.preventDefault();
    setSending(true);
    const res = await fetch(`/api/rooms/${code}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      body: JSON.stringify({ email: to, newsletter }),
    }).catch(() => null);
    setSending(false);
    if (res?.ok) {
      flash(`Sent to ${to}.${newsletter ? " Click the link in it to confirm the newsletter." : ""}`);
    } else if (res?.status === 503) {
      await email();
    } else {
      flash((await res?.json().catch(() => null))?.error ?? "Couldn't send. Try Copy summary instead.");
    }
  }

  async function email() {
    const text = retroSummary(room, window.location.href);
    const copied = await copy(text);
    // Mail apps cut off very long mailto links, so long boards go via the clipboard.
    const body =
      text.length > 1800
        ? `${text.slice(0, 1500)}\n\n…The full summary is on your clipboard${copied ? "" : " (copy it from QuickPoker)"}. Paste it here to replace this text.`
        : text;
    const subject = `Retro summary: ${room.name}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (copied) flash("Summary copied. Your mail app should open.");
  }

  function csv() {
    const rows: string[][] = [["Section", "Item", "Votes", "Owner", "Done"]];
    for (const col of room.columns) {
      for (const c of sortCards(room.cards.filter((c) => c.columnId === col.id))) {
        rows.push([col.title, c.text ?? "", String(c.votes ?? ""), "", ""]);
      }
    }
    for (const a of room.actions) rows.push(["Action item", a.text, "", a.owner ?? "", a.done ? "Yes" : "No"]);
    const data = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + data], { type: "text/csv" }));
    a.download = `${room.name.replace(/[^\w-]+/g, "-")}-retro.csv`;
    a.click();
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="t-label">Save the board</span>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={() => window.print()}>Print or save PDF</button>
        <button className="btn btn-secondary" onClick={email}>Open in my mail app</button>
        <button className="btn btn-ghost" onClick={csv}>Download CSV</button>
        <button
          className="btn btn-ghost"
          onClick={async () => flash((await copy(retroSummary(room, window.location.href))) ? "Summary copied." : "Couldn't copy. Use Download CSV instead.")}
        >
          Copy summary
        </button>
      </div>
      <form className="flex flex-col gap-2 print:hidden" onSubmit={emailMe}>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="email-board" className="sr-only">Email address</label>
          <input id="email-board" type="email" className="field h-11 max-w-xs flex-1" placeholder="you@company.com" value={to} onChange={(e) => setTo(e.target.value)} required autoComplete="email" />
          <button type="submit" className="btn btn-secondary" disabled={sending}>{sending ? "Sending…" : "Email me this board"}</button>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" className="h-4 w-4" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
          Also send me the QuickPoker newsletter (retro ideas and templates)
        </label>
      </form>
      <p className="min-h-5 text-sm text-ink-2" aria-live="polite">{note ?? "The board is deleted 24 hours after its last use, so save it before then."}</p>
      {AI_ON && <AiSummaryPanel code={code} room={room} headers={headers} act={act} />}
    </div>
  );
}

const AI_ON = process.env.NEXT_PUBLIC_AI_SUMMARY === "1";

interface AiSummary {
  overview: string;
  themes: { title: string; summary: string; cards: number }[];
  actions: { text: string; why: string }[];
}

function AiSummaryPanel({ code, room, headers, act }: { code: string; room: RetroView; headers: Headers; act: Act }) {
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/rooms/${code}/ai-summary`, { method: "POST", headers: headers() }).catch(() => null);
    setBusy(false);
    if (res?.ok) setSummary(await res.json());
    else setError((await res?.json().catch(() => null))?.error ?? "Couldn't reach the AI. Try again.");
  }

  async function add(text: string) {
    if (await act({ type: "addAction", text: text.slice(0, RETRO_LIMITS.actionText) })) setAdded((a) => [...a, text]);
  }

  return (
    <div className="card mt-2 flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="t-label">AI summary</span>
        <button className="btn btn-secondary print:hidden" onClick={run} disabled={busy}>
          {busy ? "Reading the board…" : summary ? "Summarize again" : "Summarize with AI"}
        </button>
      </div>
      {!summary && !error && (
        <p className="text-sm text-ink-2">Groups the cards into themes and suggests up to three action items. The card text is sent to Anthropic to create it.</p>
      )}
      {error && <p className="text-sm text-danger-700" role="alert">{error}</p>}
      {summary && (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p>{summary.overview}</p>
          {summary.themes.length > 0 && (
            <ul className="flex flex-col gap-2">
              {summary.themes.map((t) => (
                <li key={t.title}>
                  <span className="font-semibold">{t.title}</span>
                  <span className="text-ink-2"> ({t.cards} {t.cards === 1 ? "card" : "cards"}): </span>
                  {t.summary}
                </li>
              ))}
            </ul>
          )}
          {summary.actions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="t-label">Suggested action items</span>
              {summary.actions.map((a) => (
                <div key={a.text} className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{a.text}</div>
                    <div className="text-sm text-ink-2">{a.why}</div>
                  </div>
                  <button
                    className="btn btn-ghost print:hidden"
                    disabled={added.includes(a.text) || room.actions.some((x) => x.text === a.text.slice(0, RETRO_LIMITS.actionText))}
                    onClick={() => add(a.text)}
                  >
                    {added.includes(a.text) ? "Added" : "Add to action items"}
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-ink-2">Written by AI from the cards on this board. Check it before you share it.</p>
        </div>
      )}
    </div>
  );
}

function sortCards(cards: RetroCardView[]) {
  return [...cards].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
}

function Board({ room, act }: { room: RetroView; act: Act }) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] print:[grid-template-columns:repeat(auto-fit,minmax(0,1fr))]">
      {room.columns.map((col, i) => (
        <Column key={col.id} room={room} act={act} columnId={col.id} title={col.title} accent={ACCENTS[i % ACCENTS.length]} />
      ))}
    </div>
  );
}

const ACCENTS = ["border-t-green-700", "border-t-danger-700", "border-t-navy-700", "border-t-teal-700"];

function Column({ room, act, columnId, title, accent }: { room: RetroView; act: Act; columnId: string; title: string; accent: string }) {
  const [draft, setDraft] = useState("");
  const cards = room.cards.filter((c) => c.columnId === columnId);
  const shown = room.phase === "discuss" ? sortCards(cards) : cards;
  const inputId = `add-${columnId}`;
  return (
    <section aria-labelledby={`col-${columnId}`} className={`card flex min-w-0 flex-col gap-3 border-t-4 ${accent} p-4 print:break-inside-avoid`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={`col-${columnId}`} className="text-lg font-semibold">{title}</h2>
        <span className="t-label">{cards.length} {cards.length === 1 ? "card" : "cards"}</span>
      </div>
      {room.phase === "write" && (
        <form
          className="flex flex-col gap-2 print:hidden"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await act({ type: "addCard", columnId, text: draft })) setDraft("");
          }}
        >
          <label htmlFor={inputId} className="sr-only">Add a card to {title}</label>
          <textarea
            id={inputId}
            className="field min-h-[72px] resize-y text-[15px]"
            placeholder="Type a card, then press Enter"
            value={draft}
            maxLength={RETRO_LIMITS.cardText}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button type="submit" className="btn btn-secondary h-10" disabled={!draft.trim()}>Add card</button>
        </form>
      )}
      {shown.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong p-4 text-sm text-muted">No cards yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((c) => <Card key={c.id} card={c} room={room} act={act} />)}
        </ul>
      )}
    </section>
  );
}

function Card({ card, room, act }: { card: RetroCardView; room: RetroView; act: Act }) {
  const me = room.me!;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(card.text ?? "");
  const canDelete = card.mine || me.isFacilitator;

  if (card.text === null) {
    return (
      <li className="flex min-h-14 flex-col justify-center gap-1.5 rounded-md border border-line bg-subtle px-3 py-3" aria-label="Hidden card from a teammate">
        <span className="h-2 w-4/5 rounded-full bg-line-strong/70" />
        <span className="h-2 w-1/2 rounded-full bg-line-strong/70" />
      </li>
    );
  }

  if (editing) {
    return (
      <li>
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await act({ type: "editCard", cardId: card.id, text })) setEditing(false);
          }}
        >
          <label className="sr-only" htmlFor={`edit-${card.id}`}>Edit card</label>
          <textarea id={`edit-${card.id}`} className="field min-h-[72px] text-[15px]" value={text} maxLength={RETRO_LIMITS.cardText} onChange={(e) => setText(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary h-9 flex-1" disabled={!text.trim()}>Save</button>
            <button type="button" className="btn btn-secondary h-9" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`flex flex-col gap-2 rounded-md border px-3 py-2.5 text-[15px] print:break-inside-avoid ${card.mine ? "border-navy-100 bg-navy-50/60" : "border-line bg-canvas"}`}>
      <p className="whitespace-pre-wrap break-words">{card.text}</p>
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          {room.phase === "discuss" && (
            <span className="inline-flex h-7 items-center rounded-sm bg-navy-50 px-2 font-mono text-[13px] font-semibold text-navy-700">
              {card.votes} {card.votes === 1 ? "vote" : "votes"}
            </span>
          )}
          {card.mine && <span className="t-label print:hidden">Yours</span>}
        </span>
        <span className="flex items-center gap-1 print:hidden">
          {room.phase === "vote" && (
            <>
              {card.myVotes > 0 && (
                <button className="btn btn-ghost h-8 w-8 px-0" aria-label="Remove one vote" onClick={() => act({ type: "unvote", cardId: card.id })}>−</button>
              )}
              <span className="flex gap-0.5" aria-label={`${card.myVotes} of your votes`}>
                {Array.from({ length: card.myVotes }, (_, i) => <span key={i} className="h-2.5 w-2.5 rounded-full bg-navy-700" />)}
              </span>
              <button className="btn btn-secondary h-8 px-2.5 text-[13px]" disabled={me.votesLeft === 0} onClick={() => act({ type: "vote", cardId: card.id })}>
                + Vote
              </button>
            </>
          )}
          {card.mine && room.phase !== "discuss" && (
            <button className="btn btn-ghost h-8 px-2 text-[13px]" onClick={() => { setText(card.text ?? ""); setEditing(true); }}>Edit</button>
          )}
          {canDelete && (
            <button className="btn btn-ghost h-8 px-2 text-[13px] hover:!bg-danger-50 hover:!text-danger-700" onClick={() => act({ type: "deleteCard", cardId: card.id })}>
              Delete
            </button>
          )}
        </span>
      </div>
    </li>
  );
}

function Actions({ room, act }: { room: RetroView; act: Act }) {
  const [text, setText] = useState("");
  const [owner, setOwner] = useState("");
  const me = room.me!;
  return (
    <section aria-labelledby="actions-h" className="card flex min-w-0 flex-[3_1_480px] flex-col gap-4 p-6 print:break-inside-avoid">
      <div className="flex items-baseline justify-between">
        <h2 id="actions-h" className="text-lg font-semibold">Action items</h2>
        <span className="t-label">{room.actions.filter((a) => a.done).length} of {room.actions.length} done</span>
      </div>
      {room.actions.length === 0 ? (
        <p className="text-sm text-muted">No action items yet. Capture what the team will do differently next sprint.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {room.actions.map((a) => (
            <li key={a.id} className="flex min-h-12 items-center gap-3 py-2">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-green-700"
                checked={a.done}
                onChange={() => act({ type: "toggleAction", actionId: a.id })}
                aria-label={`Mark "${a.text}" as ${a.done ? "not done" : "done"}`}
              />
              <span className={`flex-1 text-[15px] ${a.done ? "text-muted line-through" : ""}`}>{a.text}</span>
              {a.owner && <span className="rounded-sm bg-teal-50 px-2 py-0.5 text-[13px] font-medium text-teal-700">{a.owner}</span>}
              {(a.mine || me.isFacilitator) && (
                <button className="btn btn-ghost h-8 px-2 text-[13px] print:hidden" aria-label={`Delete action item: ${a.text}`} onClick={() => act({ type: "deleteAction", actionId: a.id })}>
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-wrap gap-2 print:hidden"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await act({ type: "addAction", text, owner: owner || null })) {
            setText("");
            setOwner("");
          }
        }}
      >
        <label htmlFor="action-text" className="sr-only">New action item</label>
        <input id="action-text" className="field min-w-0 flex-[3_1_240px]" placeholder="New action item" value={text} maxLength={RETRO_LIMITS.actionText} onChange={(e) => setText(e.target.value)} />
        <label htmlFor="action-owner" className="sr-only">Owner</label>
        <select id="action-owner" className="field w-auto min-w-0 flex-[1_1_140px]" value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">No owner</option>
          {room.participants.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>Add</button>
      </form>
    </section>
  );
}

function People({ room, act }: { room: RetroView; act: Act }) {
  const me = room.me!;
  return (
    <section aria-labelledby="people-h" className="card flex min-w-0 flex-[1_1_260px] flex-col gap-3 p-6 print:hidden">
      <h2 id="people-h" className="text-lg font-semibold">People</h2>
      <ul className="flex flex-col gap-1">
        {room.participants.map((p) => (
          <li key={p.id} className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${p.online ? "bg-green-700" : "bg-line-strong"}`} />
              <span className={p.id === me.id ? "font-semibold" : ""}>{p.name}{p.id === me.id ? " (you)" : ""}</span>
              <span className="sr-only">{p.online ? "online" : "away"}</span>
              {p.isFacilitator && <span className="t-label">Facilitator</span>}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[13px] text-muted">
                {room.phase === "vote" ? `${p.votesUsed}/${room.votesPerPerson} votes` : `${p.cards} ${p.cards === 1 ? "card" : "cards"}`}
              </span>
              {me.isFacilitator && p.id !== me.id && (
                <>
                  <button className="btn btn-ghost h-8 px-2 text-[13px]" onClick={() => act({ type: "makeFacilitator", participantId: p.id })}>Make facilitator</button>
                  <button className="btn btn-ghost h-8 px-2 text-[13px]" onClick={() => act({ type: "removeParticipant", participantId: p.id })}>Remove</button>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
