import { getStore } from "@/lib/store";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = token.length > 10 && (await getStore().confirmLead(token).catch(() => false));
  return Response.redirect(new URL(`/newsletter?status=${ok ? "confirmed" : "invalid"}`, req.url), 303);
}
