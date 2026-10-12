import type { Metadata } from "next";
import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PRO_PACK, RESOURCES } from "@/lib/toolkit";

export const metadata: Metadata = {
  title: "Free facilitator toolkit: retro formats, icebreakers, estimation",
  description: "Free printable guides for agile facilitators: six retro formats, 20 icebreakers, a story point cheat sheet, and Definition of Ready and Done checklists.",
};

// Set NEXT_PUBLIC_TOOLKIT_PAY_URL to a Stripe Payment Link to sell the Pro Pack.
const payUrl = process.env.NEXT_PUBLIC_TOOLKIT_PAY_URL;

export default function Toolkit() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 bg-canvas">
        <div className="container-page flex flex-col gap-12 py-16 md:py-24">
          <div className="flex max-w-3xl flex-col gap-5">
            <p className="t-eyebrow">Facilitator toolkit</p>
            <h1 className="t-h2">Everything you need to run a great meeting.</h1>
            <p className="t-lead">Free guides you can read, print or save as PDF. Bring them to your next retro or planning session.</p>
          </div>
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {RESOURCES.map((r) => (
              <li key={r.slug} className="card flex flex-col gap-2 p-6">
                <span className="t-label">Free</span>
                <h2 className="text-xl font-semibold">{r.title}</h2>
                <p className="flex-1 text-ink-2">{r.summary}</p>
                <Link href={`/toolkit/${r.slug}`} className="btn btn-secondary self-start">Open guide</Link>
              </li>
            ))}
            <li className="card flex flex-col gap-2 border-navy-700 p-6">
              <span className="t-label">{PRO_PACK.price} one-time</span>
              <h2 className="text-xl font-semibold">{PRO_PACK.name}</h2>
              <ul className="flex flex-1 list-disc flex-col gap-1 pl-5 text-ink-2">
                {PRO_PACK.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
              {payUrl ? (
                <a href={payUrl} className="btn btn-primary self-start">Buy for {PRO_PACK.price}</a>
              ) : (
                <a href="#pro-pack" className="btn btn-primary self-start">Get it first</a>
              )}
            </li>
          </ul>
          {!payUrl && (
            <section id="pro-pack" aria-labelledby="pro-h" className="flex max-w-3xl scroll-mt-8 flex-col gap-4">
              <h2 id="pro-h" className="text-2xl font-semibold">Get the {PRO_PACK.name} when it launches</h2>
              <p className="text-ink-2">Leave your email and we&apos;ll send you a launch discount.</p>
              <LeadForm
                kind="toolkit"
                source="/toolkit"
                defaultInterest={PRO_PACK.name}
                submitLabel="Notify me"
                doneTitle="You're on the list."
                doneText="We'll email you the launch discount when the Pro Pack is ready."
              />
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
