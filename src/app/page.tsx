import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StartRoom } from "@/components/StartRoom";

const steps = [
  { n: "01", title: "Create a room", body: "Type your name and pick a deck. No account, no email." },
  { n: "02", title: "Share the link", body: "Teammates open it in any browser, on a laptop or a phone." },
  { n: "03", title: "Add your stories", body: "Type them in or paste a list, one story per line." },
  { n: "04", title: "Vote and reveal", body: "Everyone picks a card, the facilitator reveals, and the estimate is saved to the story." },
];

const retroFacts = [
  { title: "Four formats", body: "Went well, To improve, Try next. Start, Stop, Continue. Mad, Sad, Glad. Or the 4 Ls." },
  { title: "Anonymous cards", body: "Cards don't show who wrote them, and stay hidden until the facilitator reveals them." },
  { title: "Dot voting and a timer", body: "Everyone gets a few votes, the board sorts itself, and a shared timer keeps it moving." },
  { title: "Print, email or download", body: "Save the board as a PDF, email the summary to your team, or download it as a spreadsheet." },
];

const networkFacts = [
  { title: "One address", body: "Pages and room updates come from the same website, so there is nothing extra for IT to allow." },
  { title: "Plain HTTPS fallback", body: "If live updates are blocked, the room checks for changes every few seconds instead." },
  { title: "Gone in 24 hours", body: "Rooms, votes and stories are deleted a day after the room was last used." },
  { title: "No accounts", body: "We store only the display name you type, and only for that room." },
];

const moreLinks = [
  { href: "/toolkit", title: "Free facilitator toolkit", body: "Retro formats, icebreakers and an estimation cheat sheet you can print." },
  { href: "/quiz", title: "Practice quizzes", body: "Test your Scrum and estimation knowledge, with an explanation for every answer." },
  { href: "/services", title: "Coaching and facilitation", body: "Get help running retros, PI planning and team workshops." },
  { href: "/newsletter", title: "Newsletter", body: "Agile tips, new templates and career guides, about twice a month." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="grid-bg border-b border-line bg-subtle">
          <div className="container-page flex flex-col gap-12 py-16 md:py-24">
            <div className="flex max-w-3xl flex-col">
              <p className="t-eyebrow">Free planning poker and retros, no sign-up</p>
              <h1 className="t-display mt-4">Estimate together, from any network.</h1>
              <p className="t-lead mt-6 max-w-[42rem]">
                Estimate stories with planning poker or run your sprint retro, then share the link. QuickPoker runs as an
                ordinary website, so it opens behind company firewalls and VPNs. Rooms are deleted 24 hours after their last use.
              </p>
            </div>
            <StartRoom />
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 bg-canvas">
          <div className="container-page flex flex-col gap-12 py-20 md:py-28">
            <div className="flex flex-col gap-3">
              <p className="t-eyebrow">How it works</p>
              <h2 className="t-h2">From link to estimate in four steps.</h2>
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
              <h2 className="t-h2">Run the retro in the same place.</h2>
              <p className="t-lead mt-2">Pick a format, set a timer, and let everyone write privately before the cards are revealed.</p>
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
              <h2 id="more-h" className="t-h2">Run better meetings, not just faster ones.</h2>
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
