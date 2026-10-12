import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StartRoom } from "@/components/StartRoom";

const steps = [
  { n: "01", title: "Open a room", body: "Enter your name and pick a deck: Fibonacci, T-shirt sizes or your own. No account, no email." },
  { n: "02", title: "Share the link", body: "Drop it in the meeting chat. Developers join from any browser, on a laptop or a phone." },
  { n: "03", title: "Load the backlog items", body: "Paste the items you refined, one per line, in the order the Product Owner wants them." },
  { n: "04", title: "Vote, reveal, talk", body: "Everyone votes in private and the cards flip together. Hear the highs and lows, re-vote, and save the estimate." },
];

const retroFacts = [
  { title: "Proven formats", body: "Went well, To improve, Try next. Start, Stop, Continue. Mad, Sad, Glad. The 4 Ls. Change it up when the team goes quiet." },
  { title: "Safe to be honest", body: "Cards are anonymous and stay hidden until the facilitator reveals them, so the loudest voice doesn't set the agenda." },
  { title: "Dot voting and a timer", body: "The team picks what to discuss, the board sorts itself, and a shared timer keeps the event inside its time-box." },
  { title: "Leave with owned actions", body: "Capture improvements with an owner, then print, email or export them before the board is deleted." },
];

const networkFacts = [
  { title: "One address", body: "Pages and room updates come from the same website, so there is nothing extra for IT to allow." },
  { title: "Plain HTTPS fallback", body: "If live updates are blocked, the room checks for changes every few seconds instead." },
  { title: "Gone in 24 hours", body: "Rooms, votes and stories are deleted a day after the room was last used." },
  { title: "No accounts", body: "We store only the display name you type, and only for that room. Nothing to approve with procurement." },
];

const moreLinks = [
  { href: "/toolkit", title: "Scrum Master toolkit", body: "Retro formats, icebreakers, an estimation cheat sheet and Definition of Done templates, free to print." },
  { href: "/quiz", title: "Scrum practice quizzes", body: "Check your grasp of the Scrum Guide and estimation, with the reasoning behind every answer." },
  { href: "/services", title: "Coaching and facilitation", body: "An experienced hand for your Sprint events, team health checks and Scrum workshops." },
  { href: "/newsletter", title: "Newsletter", body: "Facilitation techniques and Scrum field notes, about twice a month." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="grid-bg border-b border-line bg-subtle">
          <div className="container-page flex flex-col gap-12 py-16 md:py-24">
            <div className="flex max-w-3xl flex-col">
              <p className="t-eyebrow">Planning poker and retrospectives for Scrum teams</p>
              <h1 className="t-display mt-4">Better Sprint events, from any network.</h1>
              <p className="t-lead mt-6 max-w-[42rem]">
                Size your Product Backlog with planning poker and run your Sprint Retrospective in one free tool. No sign-up,
                and it opens behind company firewalls and VPNs. Rooms are deleted 24 hours after their last use.
              </p>
            </div>
            <StartRoom />
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 bg-canvas">
          <div className="container-page flex flex-col gap-12 py-20 md:py-28">
            <div className="flex flex-col gap-3">
              <p className="t-eyebrow">How it works</p>
              <h2 className="t-h2">Estimate the way good Scrum teams do.</h2>
            </div>
            <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <li key={s.n} className="flex flex-col gap-2 border-t-2 border-ink pt-5">
                  <span className="font-mono text-sm text-teal-700">{s.n}</span>
                  <h3 className="text-xl font-semibold">{s.title}</h3>
                  <p className="text-[15px] text-ink-2">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="retros" className="scroll-mt-20 border-t border-line bg-subtle">
          <div className="container-page flex flex-wrap gap-12 py-20 md:py-28">
            <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3">
              <p className="t-eyebrow">Retrospectives</p>
              <h2 className="t-h2">Retros that end in real improvements.</h2>
              <p className="t-lead mt-2">The Sprint Retrospective is where the team gets better. Give everyone a voice, focus on what matters most, and leave with one or two actions people actually own.</p>
            </div>
            <ul className="grid min-w-0 flex-[1_1_520px] gap-8 sm:grid-cols-2">
              {retroFacts.map((f) => (
                <li key={f.title} className="flex flex-col gap-2 border-t-2 border-ink pt-5">
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="text-[15px] text-ink-2">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="company-networks" className="scroll-mt-20 bg-navy-900 text-navy-100">
          <div className="container-page flex flex-wrap gap-16 py-20 md:py-28">
            <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3">
              <p className="t-eyebrow !text-teal-100">Built for company networks</p>
              <h2 className="t-h2 !text-white">Opens where your team works.</h2>
              <p className="mt-2 text-lg">
                Corporate firewalls often block live connections to unfamiliar servers. QuickPoker never depends on one.
              </p>
            </div>
            <div className="grid min-w-0 flex-[1_1_520px] gap-8 sm:grid-cols-2">
              {networkFacts.map((f) => (
                <div key={f.title} className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold !text-white">{f.title}</h3>
                  <p className="text-[15px]">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section aria-labelledby="more-h" className="border-t border-line bg-canvas">
          <div className="container-page flex flex-col gap-8 py-20 md:py-24">
            <div className="flex max-w-3xl flex-col gap-3">
              <p className="t-eyebrow">More for your team</p>
              <h2 id="more-h" className="t-h2">Grow as a Scrum team, not just a faster one.</h2>
            </div>
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {moreLinks.map((m) => (
                <li key={m.href}>
                  <Link href={m.href} className="card flex h-full flex-col gap-2 p-6 hover:border-navy-600">
                    <h3 className="text-lg font-semibold">{m.title}</h3>
                    <p className="text-[15px] text-ink-2">{m.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
