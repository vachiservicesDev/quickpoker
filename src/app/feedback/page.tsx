import type { Metadata } from "next";
import { FeedbackForm } from "@/components/FeedbackForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Tell us what would make QuickPoker better for your team.",
};

export default function Feedback() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 bg-subtle">
        <div className="container-page flex max-w-2xl flex-col gap-6 py-16 md:py-24">
          <p className="t-eyebrow">Feedback</p>
          <h1 className="t-h2">Tell us what would help your team.</h1>
          <p className="t-lead">Found a bug, missing a feature, or blocked on your company network? We read every message.</p>
          <FeedbackForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
