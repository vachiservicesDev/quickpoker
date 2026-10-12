"use client";

import { notFound, useParams } from "next/navigation";
import { PokerRoom } from "@/components/PokerRoom";

export function RoomFromParams() {
  const { code: raw } = useParams<{ code: string }>();
  const code = raw.toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) notFound();
  return <PokerRoom code={code} />;
}
