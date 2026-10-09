import { handle, noStore, rateLimit, readJson } from "@/lib/http";
import { RoomError } from "@/lib/poker";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  return handle(async () => {
    rateLimit(req, "feedback", 5);
    const body = await readJson(req);
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (message.length < 3) throw new RoomError("Write a few words of feedback.");
    if (message.length > 4000) throw new RoomError("Keep feedback under 4,000 characters.");
    const contact = typeof body.contact === "string" && body.contact.trim() ? body.contact.trim().slice(0, 200) : null;
    const page = typeof body.page === "string" ? body.page.slice(0, 200) : null;
    await getStore().saveFeedback({ message, contact, page });
    return Response.json({ ok: true }, { status: 201, headers: noStore });
  });
}
