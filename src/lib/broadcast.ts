import "server-only";
import { after } from "next/server";

// Tells browsers watching a room that it changed. Only the version number goes
// out; browsers then read the room from our own API, which hides unrevealed votes.
// Best effort: if this fails, browsers still pick the change up by polling.
async function send(code: string, version: number): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ topic: `room:${code}`, event: "changed", payload: { version } }] }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Polling covers it.
  }
}

/** Sends the ping after the response goes out, so the click itself isn't slowed down. */
export function broadcastRoomChanged(code: string, version: number) {
  try {
    after(() => send(code, version));
  } catch {
    // Outside a request (tests, scripts): send it now without waiting.
    void send(code, version);
  }
}
