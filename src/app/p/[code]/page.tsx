import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomFromParams } from "./RoomFromParams";

export const metadata: Metadata = {
  title: "Planning poker room",
  robots: { index: false, follow: false },
};

export default function RoomPage() {
  return (
    <Suspense fallback={<p className="p-8 text-ink-2" role="status">Opening room…</p>}>
      <RoomFromParams />
    </Suspense>
  );
}
