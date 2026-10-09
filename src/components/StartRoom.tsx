"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DECKS, type DeckId } from "@/lib/poker";
import { saveIdentity } from "@/lib/useRoom";

const deckOptions: { id: DeckId; label: string }[] = [
  ...Object.entries(DECKS).map(([id, d]) => ({ id: id as DeckId, label: d.label })),
  { id: "custom", label: "Custom" },
];

export function StartRoom() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [deckId, setDeckId] = useState<DeckId>("fibonacci");
  const [custom, setCustom] = useState("1, 2, 3, 5, 8, ?");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("create");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          roomName,
          deckId,
          cards: deckId === "custom" ? custom.split(",").map((c) => c.trim()).filter(Boolean) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't create the room. Try again.");
      saveIdentity(data.code, { participantId: data.participantId, secret: data.secret });
      router.push(`/p/${data.code}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length !== 6) {
      setError("Enter the 6-character room code, like K7Q4MD.");
      return;
    }
    setBusy("join");
    router.push(`/p/${clean}`);
  }

  return (
    <div id="start" className="flex scroll-mt-24 flex-col gap-6">
      {error && (
        <p role="alert" className="rounded-md border border-danger-700/25 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-6">
        <form onSubmit={create} className="card flex min-w-0 flex-[1_1_320px] flex-col gap-4 p-6 shadow-[var(--shadow-panel)] md:p-8">
          <h2 className="font-display text-xl font-semibold">Create a room</h2>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="your-name" className="text-sm font-medium">Your name</label>
            <input id="your-name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoComplete="nickname" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="room-name" className="text-sm font-medium">
              Room name <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="room-name" className="field" value={roomName} onChange={(e) => setRoomName(e.target.value)} maxLength={80} placeholder="Sprint 42 planning" />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Card deck</legend>
            <div className="flex flex-wrap gap-2">
              {deckOptions.map((d) => (
                <button key={d.id} type="button" className="chip" aria-pressed={deckId === d.id} onClick={() => setDeckId(d.id)}>
                  {d.label}
                </button>
              ))}
            </div>
            {deckId === "custom" && (
              <div className="mt-2 flex flex-col gap-1.5">
                <label htmlFor="custom-cards" className="text-sm font-medium">Cards, separated by commas</label>
                <input id="custom-cards" className="field" value={custom} onChange={(e) => setCustom(e.target.value)} />
              </div>
            )}
          </fieldset>
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy !== null || !name.trim()}>
            {busy === "create" ? "Creating room…" : "Create room"}
          </button>
        </form>

        <form onSubmit={join} className="card flex min-w-0 flex-[1_1_240px] flex-col gap-4 self-start p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold">Join a room</h2>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="room-code" className="text-sm font-medium">Room code</label>
            <input
              id="room-code"
              className="field font-mono text-lg tracking-[0.12em] uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={8}
              autoComplete="off"
              aria-describedby="room-code-hint"
            />
            <p id="room-code-hint" className="text-sm text-muted">Or open the link a teammate shared.</p>
          </div>
          <button type="submit" className="btn btn-secondary btn-lg" disabled={busy !== null}>
            {busy === "join" ? "Opening room…" : "Join room"}
          </button>
        </form>
      </div>
    </div>
  );
}
