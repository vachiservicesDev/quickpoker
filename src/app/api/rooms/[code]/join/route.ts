import { codeFrom, handle, noStore, rateLimit, readJson } from "@/lib/http";
import { joinRoom } from "@/lib/rooms";

export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  return handle(async () => {
    rateLimit(req, "join", 600);
    const code = codeFrom((await ctx.params).code);
    const joined = await joinRoom(code, await readJson(req));
    return Response.json(joined, { status: 201, headers: noStore });
  });
}
