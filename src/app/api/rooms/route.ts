import { handle, noStore, rateLimit, readJson } from "@/lib/http";
import { createRoom } from "@/lib/rooms";

export async function POST(req: Request) {
  return handle(async () => {
    rateLimit(req, "create", 20);
    const joined = await createRoom(await readJson(req));
    return Response.json(joined, { status: 201, headers: noStore });
  });
}
