"use client";

import { useState } from "react";

// Double opt-in: the address only gets the newsletter after the confirmation link is clicked.
export function NewsletterForm({ source, compact = false }: { source: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state === "sent") {
    return (
      <p role="status" className="text-[15px] font-medium text-green-700">
        {confirm ? "Almost done. Check your inbox and click the link to confirm." : "Thanks, you're on the list. We'll confirm by email before sending anything."}
      </p>
    );
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setState("sending");
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "newsletter", email, source }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok) {
          setConfirm(Boolean(data?.confirmationSent));
          setState("sent");
        } else {
          setError(data?.error ?? "Couldn't sign you up. Try again.");
          setState("idle");
        }
      }}
    >
      <label htmlFor={`nl-${source}`} className={compact ? "text-sm font-medium" : "font-medium"}>
        Get Scrum facilitation tips and new retro formats by email
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={`nl-${source}`}
          type="email"
          className="field max-w-sm flex-1"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <button type="submit" className="btn btn-primary h-12" disabled={state === "sending"}>
          {state === "sending" ? "Signing up…" : "Subscribe"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
      <p className="text-[13px] text-muted">About twice a month. Unsubscribe with one click.</p>
    </form>
  );
}
