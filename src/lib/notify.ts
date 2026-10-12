import "server-only";

// Email goes out through Resend's HTTP API. Everything here is optional: with
// no RESEND_API_KEY, feedback and leads are still saved in Supabase.
//
// Two kinds of email:
// - To the site owner (FEEDBACK_TO_EMAIL): feedback and new leads. Resend's
//   test sender can do this before a domain is verified.
// - To visitors (newsletter confirmations, "email me this board"): needs
//   EMAIL_FROM on a domain verified in Resend, because the test sender can only
//   write to the Resend account's own address.

export function canEmailVisitors(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://quickpoker-nine.vercel.app";
}

export const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

interface Email {
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
  from?: string;
  headers?: Record<string, string>;
}

async function send(email: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || email.to.length === 0) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: email.from ?? process.env.EMAIL_FROM ?? process.env.FEEDBACK_FROM_EMAIL ?? "QuickPoker <onboarding@resend.dev>",
        to: email.to,
        subject: email.subject,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        ...(email.headers ? { headers: email.headers } : {}),
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.error("Email failed", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (err) {
    console.error("Email failed", err);
    return false;
  }
}

function ownerAddresses(): string[] {
  return (process.env.FEEDBACK_TO_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** Tells the site owner about something that came in through the site. */
export function emailOwner(subject: string, lines: string[], replyTo?: string | null): Promise<boolean> {
  return send({
    to: ownerAddresses(),
    from: process.env.FEEDBACK_FROM_EMAIL || process.env.EMAIL_FROM || "QuickPoker <onboarding@resend.dev>",
    subject,
    text: [...lines, "", `Sent: ${new Date().toISOString()}`].join("\n"),
    ...(replyTo && looksLikeEmail(replyTo) ? { replyTo } : {}),
  });
}

export function emailFeedback(entry: { message: string; contact: string | null; page: string | null }): Promise<boolean> {
  return emailOwner(
    `QuickPoker feedback: ${entry.message.replace(/\s+/g, " ").slice(0, 60)}`,
    [entry.message, "", `Contact: ${entry.contact ?? "not given"}`, `Page: ${entry.page ?? "unknown"}`],
    entry.contact,
  );
}

/** Email to a visitor, with an unsubscribe link when it carries marketing. */
export function emailVisitor(to: string, subject: string, text: string, unsubscribeToken?: string): Promise<boolean> {
  if (!canEmailVisitors()) return Promise.resolve(false);
  const unsubscribe = unsubscribeToken ? `${siteUrl()}/api/leads/unsubscribe?token=${unsubscribeToken}` : null;
  const footer = [
    "",
    "--",
    "QuickPoker by Vachi Services LLC",
    "83 Wooster Heights Rd, Suite 125, Danbury, CT 06810",
    ...(unsubscribe ? [`Unsubscribe: ${unsubscribe}`] : []),
  ];
  return send({
    to: [to],
    subject,
    text: [text, ...footer].join("\n"),
    ...(unsubscribe ? { headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
  });
}
