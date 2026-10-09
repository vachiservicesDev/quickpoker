import { codeFrom, handle, identityFrom, noStore, rateLimit, readJson } from "@/lib/http";
import type { PokerAction } from "@/lib/poker";
import { actInRoom } from "@/lib/rooms";

export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/actions">) {
  return handle(async () => {
    rateLimit(req, "act", 180);
    const code = codeFrom((await ctx.params).code);
    const action = (await readJson(req)) as unknown as PokerAction;
    const result = await actInRoom(code, identityFrom(req), action);
    return Response.json(result, { headers: noStore });
  });
}
