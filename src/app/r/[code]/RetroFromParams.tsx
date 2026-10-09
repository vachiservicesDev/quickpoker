"use client";

import { notFound, useParams } from "next/navigation";
import { RetroRoom } from "@/components/RetroRoom";

export function RetroFromParams() {
  const { code: raw } = useParams<{ code: string }>();
  const code = raw.toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) notFound();
  return <RetroRoom code={code} />;
}
