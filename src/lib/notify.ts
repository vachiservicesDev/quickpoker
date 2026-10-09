import "server-only";

// Emails each feedback message to the site owner through Resend's HTTP API.
// Optional: without RESEND_API_KEY, feedback is still saved in Supabase.
export async function emailFeedback(entry: { message: string; contact: string | null; page: string | null }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;
  if (!key || !to) return false;
  const from = process.env.FEEDBACK_FROM_EMAIL || "QuickPoker <onboarding@resend.dev>";
  const text = [
    entry.message,
    "",
    `Contact: ${entry.contact ?? "not given"}`,
    `Page: ${entry.page ?? "unknown"}`,
    `Sent: ${new Date().toISOString()}`,
  ].join("\n");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: to.split(",").map((s) => s.trim()).filter(Boolean),
        subject: `QuickPoker feedback: ${entry.message.replace(/\s+/g, " ").slice(0, 60)}`,
        text,
        ...(entry.contact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.contact) ? { reply_to: entry.contact } : {}),
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.error("Feedback email failed", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (err) {
    console.error("Feedback email failed", err);
    return false;
  }
}
