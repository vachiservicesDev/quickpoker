"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, { title: string; text: string }> = {
  confirmed: { title: "You're subscribed.", text: "Thanks for confirming. The next issue will land in your inbox." },
  unsubscribed: { title: "You're unsubscribed.", text: "You won't get any more newsletters from us. Changed your mind? Sign up again below." },
  invalid: { title: "That link didn't work.", text: "It may have expired or been used already. You can sign up again below." },
};

export function Status() {
  const status = useSearchParams().get("status");
  const msg = status ? MESSAGES[status] : null;
  if (!msg) return null;
  return (
    <div role="status" className={`card flex flex-col gap-1 p-6 ${status === "invalid" ? "border-danger-700/25 bg-danger-50" : "border-green-700/25 bg-green-50"}`}>
      <h2 className={`text-xl font-semibold ${status === "invalid" ? "text-danger-700" : "text-green-700"}`}>{msg.title}</h2>
      <p className="text-ink-2">{msg.text}</p>
    </div>
  );
}
