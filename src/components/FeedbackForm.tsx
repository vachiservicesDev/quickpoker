"use client";

import { useState } from "react";

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "sent") {
    return (
      <div role="status" className="card flex flex-col gap-2 border-green-700/25 bg-green-50 p-6">
        <h2 className="text-xl font-semibold text-green-700">Thanks, we got it.</h2>
        <p className="text-ink-2">{contact ? "If we have a question we'll reach out using the contact you left." : "Your feedback goes straight into our list."}</p>
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
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, contact, page: document.referrer || null }),
        });
        if (res.ok) {
          setState("sent");
        } else {
          setError((await res.json().catch(() => null))?.error ?? "Couldn't send. Try again.");
          setState("idle");
        }
      }}
    >
      {error && <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fb-message" className="text-sm font-medium">Your feedback</label>
        <textarea id="fb-message" className="field min-h-36" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fb-contact" className="text-sm font-medium">
          Email or name <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="fb-contact" className="field" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} />
      </div>
      <button type="submit" className="btn btn-primary btn-lg self-start" disabled={state === "sending" || message.trim().length < 3}>
        {state === "sending" ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
