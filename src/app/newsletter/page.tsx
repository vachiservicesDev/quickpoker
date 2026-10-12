import type { Metadata } from "next";
import { Suspense } from "react";
import { NewsletterForm } from "@/components/NewsletterForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Status } from "./Status";

export const metadata: Metadata = {
  title: "Newsletter",
  description: "Scrum facilitation techniques, new retro formats, certification guides and QuickPoker updates, about twice a month.",
};

const TOPICS = [
  "A retro format or facilitation technique you can use in your next Sprint",
  "Common Scrum anti-patterns and how experienced teams fix them",
  "Study guides for Scrum Master and Product Owner certifications",
  "New QuickPoker features and templates, before anyone else",
];

export default function Newsletter() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 bg-subtle">
        <div className="container-page flex max-w-2xl flex-col gap-6 py-16 md:py-24">
          <Suspense>
            <Status />
          </Suspense>
          <p className="t-eyebrow">Newsletter</p>
          <h1 className="t-h2">Scrum field notes, in your inbox.</h1>
          <p className="t-lead">A short email about twice a month. No spam, and you can unsubscribe with one click.</p>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-ink-2">
            {TOPICS.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <div className="card p-6 md:p-8">
            <NewsletterForm source="/newsletter" />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
