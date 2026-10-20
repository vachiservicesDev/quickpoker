import { codeFrom, handle, identityFrom, noStore, rateLimit, readJson } from "@/lib/http";
import { boardLead } from "@/lib/leads";
import { canEmailVisitors, emailVisitor, looksLikeEmail, siteUrl } from "@/lib/notify";
import { RoomError } from "@/lib/poker";
import { retroSummary } from "@/lib/retro";
import { readRoom } from "@/lib/rooms";

// "Email me this board": the facilitator gets the retro summary in their inbox,
// and can opt in to the newsletter in the same step (confirmed by a link in
// that email).
export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/email">) {
  return handle(async () => {
    rateLimit(req, "board-email", 5);
    if (!canEmailVisitors()) throw new RoomError("Emailing boards isn't set up yet.", 503);
    const code = codeFrom((await ctx.params).code);
    const body = await readJson(req);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    if (!looksLikeEmail(email)) throw new RoomError("Enter a valid email address.");
    const result = await readRoom(code, identityFrom(req), null, false);
    const room = result?.room;
    if (!room || room.kind !== "retro") throw new RoomError("Only retro boards can be emailed.", 400);
    if (!room.me?.isFacilitator) throw new RoomError("Only the facilitator can email the board.", 403);
    if (room.phase === "write") throw new RoomError("Move past Write first so the cards are visible.", 409);

    const boardUrl = `${siteUrl()}/r/${code}`;
    let text = retroSummary(room, boardUrl);
    let token: string | undefined;
    if (body.newsletter === true) {
      token = await boardLead(email, boardUrl);
      text += [
        "",
        "",
        "You asked to get the QuickPoker newsletter. Confirm here:",
        `${siteUrl()}/api/leads/confirm?token=${token}`,
      ].join("\n");
    }
    const sent = await emailVisitor(email, `Retro summary: ${room.name}`, text, token);
    if (!sent) throw new RoomError("Couldn't send the email. Try again, or use Copy summary.", 502);
    return Response.json({ ok: true }, { headers: noStore });
  });
}
