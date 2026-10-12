"use client";

import { useState } from "react";

interface Props {
  kind: "services" | "waitlist" | "toolkit";
  source: string;
  interests?: string[];
  defaultInterest?: string;
  askMessage?: boolean;
  messageLabel?: string;
  submitLabel: string;
  doneTitle: string;
  doneText: string;
}

export function LeadForm({ kind, source, interests, defaultInterest, askMessage = false, messageLabel = "What do you need?", submitLabel, doneTitle, doneText }: Props) {
  const [form, setForm] = useState({ name: "", email: "", company: "", interest: defaultInterest ?? interests?.[0] ?? "", message: "", newsletter: false });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const id = (k: string) => `${kind}-${k}`;

  if (state === "sent") {
    return (
      <div role="status" className="card flex flex-col gap-2 border-green-700/25 bg-green-50 p-6">
        <h3 className="text-xl font-semibold text-green-700">{doneTitle}</h3>
        <p className="text-ink-2">{doneText}</p>
      </div>
    );
  }

  return (
    <form
      className="card flex flex-col gap-4 p-6 md:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setState("sending");
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, source, ...form }),
        });
        if (res.ok) setState("sent");
        else {
          setError((await res.json().catch(() => null))?.error ?? "Couldn't send. Try again.");
          setState("idle");
        }
      }}
    >
      {error && <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("name")} className="text-sm font-medium">Name</label>
          <input id={id("name")} className="field" value={form.name} onChange={set("name")} maxLength={100} autoComplete="name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("email")} className="text-sm font-medium">Work email</label>
          <input id={id("email")} type="email" className="field" value={form.email} onChange={set("email")} maxLength={254} required autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("company")} className="text-sm font-medium">Company <span className="font-normal text-muted">(optional)</span></label>
          <input id={id("company")} className="field" value={form.company} onChange={set("company")} maxLength={120} autoComplete="organization" />
        </div>
        {interests && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id("interest")} className="text-sm font-medium">Interested in</label>
            <select id={id("interest")} className="field" value={form.interest} onChange={set("interest")}>
              {interests.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
        )}
      </div>
      {askMessage && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("message")} className="text-sm font-medium">{messageLabel}</label>
          <textarea id={id("message")} className="field min-h-28 py-3" value={form.message} onChange={set("message")} maxLength={4000} required />
        </div>
      )}
      <label className="flex items-start gap-2 text-sm text-ink-2">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={form.newsletter} onChange={(e) => setForm({ ...form, newsletter: e.target.checked })} />
        Also send me the QuickPoker newsletter (Scrum facilitation tips, retro formats, certification guides). Unsubscribe anytime.
      </label>
      <button type="submit" className="btn btn-primary btn-lg self-start" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
