import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "About",
  description: "QuickPoker is built by Scrum practitioners for Scrum teams: free planning poker and Sprint Retrospective boards that work on any company network.",
};

const BELIEFS = [
  {
    title: "Estimates start conversations",
    body: "A wide spread of votes is the most useful thing planning poker gives you. It shows the team pictures different work. The number matters less than what you learn agreeing on it.",
  },
  {
    title: "Retros need psychological safety",
    body: "People won't raise the real problem with their name on it. Anonymous cards and a private writing phase get it on the board.",
  },
  {
    title: "Fewer actions, actually finished",
    body: "One improvement the team finishes beats five that roll over. Every board ends with action items and owners.",
  },
  {
    title: "Tools should get out of the way",
    body: "No accounts, no installs, nothing for IT to approve. If a tool needs a training session, it's taking time from the Sprint.",
  },
];

export default function About() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 bg-canvas">
        <div className="container-page flex max-w-3xl flex-col gap-8 py-16 md:py-24">
          <div className="flex flex-col gap-5">
            <p className="t-eyebrow">About</p>
            <h1 className="t-h2">Built by Scrum practitioners, for Scrum teams.</h1>
            <p className="t-lead">
              We facilitate Sprint Planning, refinement and Retrospectives for a living. We built QuickPoker because the
              tools we tried got in the way: sign-up walls, paywalls, and live connections that corporate VPNs blocked
              five minutes into the event.
            </p>
            <p className="text-ink-2">
              QuickPoker does two jobs well: planning poker and the Sprint Retrospective. It&apos;s free, it opens on any
              company network, and it deletes everything a day after you&apos;re done.
            </p>
          </div>
          <section aria-labelledby="beliefs-h" className="flex flex-col gap-5">
            <h2 id="beliefs-h" className="text-2xl font-semibold">What we believe about running Scrum events</h2>
            <ul className="grid gap-5 sm:grid-cols-2">
              {BELIEFS.map((b) => (
                <li key={b.title} className="card flex flex-col gap-2 p-6">
                  <h3 className="text-lg font-semibold">{b.title}</h3>
                  <p className="text-ink-2">{b.body}</p>
                </li>
              ))}
            </ul>
          </section>
          <p className="text-ink-2">
            QuickPoker is run by Vachi Services LLC. Want an experienced facilitator or coach for your team?{" "}
            <Link href="/services" className="link">See our services</Link>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
