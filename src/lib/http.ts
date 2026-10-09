import "server-only";
import { normalizeCode } from "./ids";
import { RoomError } from "./poker";
import type { Identity } from "./rooms";

export function identityFrom(req: Request): Identity | null {
  const participantId = req.headers.get("x-qp-participant");
  const secret = req.headers.get("x-qp-secret");
  return participantId && secret ? { participantId, secret } : null;
}

export function codeFrom(raw: string): string {
  const code = normalizeCode(raw);
  if (!code) throw new RoomError("That room code doesn't look right. Codes are 6 letters and numbers.", 404);
  return code;
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 64_000) throw new RoomError("That request is too large.", 413);
  try {
    const body = JSON.parse(text || "{}");
    return body && typeof body === "object" ? body : {};
  } catch {
    throw new RoomError("That request wasn't valid JSON.");
  }
}

// A small per-instance limiter. It won't stop a determined attacker across
// many serverless instances, but it blunts accidental loops and casual abuse.
const buckets = new Map<string, { tokens: number; at: number }>();

export function rateLimit(req: Request, scope: string, perMinute: number) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: perMinute, at: now };
  bucket.tokens = Math.min(perMinute, bucket.tokens + ((now - bucket.at) / 60_000) * perMinute);
  bucket.at = now;
  if (bucket.tokens < 1) throw new RoomError("Too many requests. Wait a moment and try again.", 429);
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  if (buckets.size > 10_000) buckets.clear();
}

export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((err: unknown) => {
    if (err instanceof RoomError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return Response.json({ error: "Something went wrong on our side. Try again." }, { status: 500 });
  });
}

export const noStore = { "Cache-Control": "no-store" };
