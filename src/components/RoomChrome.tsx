"use client";

import Link from "next/link";
import { useState } from "react";
import type { ConnectionMode } from "@/lib/useRoom";
import { Logo } from "./Logo";

// Shared frame for poker and retro rooms: header, connection badge, join form.

export function Shell(props: {
  code: string;
  mode: ConnectionMode;
  roomName?: string;
  fallbackTitle: string;
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
    <div className="flex min-h-screen flex-col bg-subtle print:bg-white">
      <header className="border-b border-line bg-canvas print:hidden">
        <div className="container-page flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
          <Logo size={28} />
          <div className="flex min-w-0 flex-[1_1_220px] flex-col">
            <span className="truncate font-display text-lg font-semibold">{props.roomName ?? props.fallbackTitle}</span>
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

export function ModeBadge({ mode }: { mode: ConnectionMode }) {
  const map: Record<ConnectionMode, { text: string; cls: string; title: string }> = {
    live: { text: "Live", cls: "bg-green-50 text-green-700", title: "Updates arrive instantly." },
    compatible: {
      text: "Live, compatibility mode",
      cls: "bg-teal-50 text-teal-700",
      title: "Your network blocks instant updates, so the room checks for changes every few seconds.",
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

export function JoinForm({
  room,
  error,
  onJoin,
  fallbackTitle,
  allowObserver,
}: {
  room: { name: string; participants: unknown[] } | null;
  error: string | null;
  onJoin: (name: string, role: "voter" | "observer") => Promise<boolean>;
  fallbackTitle: string;
  allowObserver: boolean;
}) {
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
      <h1 className="text-2xl font-semibold">{room?.name ?? fallbackTitle}</h1>
      {room && <p className="text-sm text-ink-2">{room.participants.length} {room.participants.length === 1 ? "person is" : "people are"} here.</p>}
      {error && <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="join-name" className="text-sm font-medium">Your name</label>
        <input id="join-name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoFocus autoComplete="nickname" />
      </div>
      {allowObserver && (
        <label className="flex items-center gap-3 text-[15px]">
          <input type="checkbox" className="h-5 w-5 accent-navy-700" checked={observer} onChange={(e) => setObserver(e.target.checked)} />
          Join as an observer (watch without voting)
        </label>
      )}
      <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !name.trim()}>
        {busy ? "Joining…" : "Join room"}
      </button>
    </form>
  );
}

export function ErrorBanner({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
  if (!error) return null;
  return (
    <div role="alert" className="container-page mt-6 print:hidden">
      <p className="flex items-center justify-between gap-4 rounded-md border border-danger-700/25 bg-danger-50 px-4 py-3 text-sm text-danger-700">
        {error}
        <button className="btn btn-ghost h-8 px-2 text-sm" onClick={onDismiss}>Dismiss</button>
      </p>
    </div>
  );
}

export function MissingRoom() {
  return (
    <div className="card mx-auto mt-16 flex max-w-lg flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">This room doesn&apos;t exist</h1>
      <p className="text-ink-2">Check the code, or the room may have been deleted. Rooms are deleted 24 hours after their last use.</p>
      <Link href="/#start" className="btn btn-primary self-start">Start a new room</Link>
    </div>
  );
}

export function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" />
    </svg>
  );
}
