import type { Metadata } from "next";
import { Suspense } from "react";
import { RetroFromParams } from "./RetroFromParams";

export const metadata: Metadata = {
  title: "Retrospective board",
  robots: { index: false, follow: false },
};

export default function RetroPage() {
  return (
    <Suspense fallback={<p className="p-8 text-ink-2" role="status">Opening board…</p>}>
      <RetroFromParams />
    </Suspense>
  );
}
