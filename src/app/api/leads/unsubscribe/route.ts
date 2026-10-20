import { getStore } from "@/lib/store";

async function unsubscribe(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = token.length > 10 && (await getStore().unsubscribeLead(token).catch(() => false));
  return ok;
}

export async function GET(req: Request) {
  const ok = await unsubscribe(req);
  return Response.redirect(new URL(`/newsletter?status=${ok ? "unsubscribed" : "invalid"}`, req.url), 303);
}

// One-click unsubscribe from mail apps (RFC 8058).
export async function POST(req: Request) {
  const ok = await unsubscribe(req);
  return new Response(null, { status: ok ? 200 : 404 });
}
