import { handle, noStore, rateLimit, readJson } from "@/lib/http";
import { captureLead } from "@/lib/leads";

export async function POST(req: Request) {
  return handle(async () => {
    rateLimit(req, "leads", 10);
    const result = await captureLead(await readJson(req));
    return Response.json({ ok: true, ...result }, { status: 201, headers: noStore });
  });
}
