import { codeFrom, handle, identityFrom, noStore, rateLimit } from "@/lib/http";
import { readRoom } from "@/lib/rooms";

export async function GET(req: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  return handle(async () => {
    rateLimit(req, "read", 240);
    const code = codeFrom((await ctx.params).code);
    const sinceParam = new URL(req.url).searchParams.get("since");
    const since = sinceParam && /^\d+$/.test(sinceParam) ? Number(sinceParam) : null;
    const result = await readRoom(code, identityFrom(req), since);
    if (!result) return new Response(null, { status: 204, headers: noStore });
    return Response.json(result, { headers: noStore });
  });
}
