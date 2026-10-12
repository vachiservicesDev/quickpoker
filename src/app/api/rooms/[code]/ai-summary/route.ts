import { summarizeRetro } from "@/lib/aiSummary";
import { codeFrom, handle, identityFrom, noStore, rateLimit } from "@/lib/http";
import { RoomError } from "@/lib/poker";
import { readRoom } from "@/lib/rooms";

// AI retro summary: themes and suggested action items, for the facilitator only.
export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/ai-summary">) {
  return handle(async () => {
    rateLimit(req, "ai-summary", 3);
    const code = codeFrom((await ctx.params).code);
    const result = await readRoom(code, identityFrom(req), null, false);
    const room = result?.room;
    if (!room || room.kind !== "retro") throw new RoomError("Only retro boards can be summarized.", 400);
    if (!room.me?.isFacilitator) throw new RoomError("Only the facilitator can summarize the board.", 403);
    if (room.phase === "write") throw new RoomError("Move past Write first so the cards are visible.", 409);
    const summary = await summarizeRetro(room);
    return Response.json(summary, { headers: noStore });
  });
}
