import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StartRoom } from "@/components/StartRoom";

const steps = [
  { n: "01", title: "Create a room", body: "Type your name and pick a deck. No account, no email." },
  { n: "02", title: "Share the link", body: "Teammates open it in any browser, on a laptop or a phone." },
  { n: "03", title: "Add your stories", body: "Type them in or paste a list, one story per line." },
  { n: "04", title: "Vote and reveal", body: "Everyone picks a card, the facilitator reveals, and the estimate is saved to the story." },
];

const networkFacts = [
  { title: "One address", body: "Pages and room updates come from the same website, so there is nothing extra for IT to allow." },
  { title: "Plain HTTPS fallback", body: "If live updates are blocked, the room checks for changes every second or two instead." },
  { title: "Gone in 24 hours", body: "Rooms, votes and stories are deleted a day after the room was last used." },
  { title: "No accounts", body: "We store only the display name you type, and only for that room." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="grid-bg border-b border-line bg-subtle">
          <div className="container-page flex flex-col gap-12 py-16 md:py-24">
            <div className="flex max-w-3xl flex-col">
              <p className="t-eyebrow">Free planning poker, no sign-up</p>
              <h1 className="t-display mt-4">Estimate together, from any network.</h1>
              <p className="t-lead mt-6 max-w-[42rem]">
                Create a room, share the link and start voting. QuickPoker runs as an ordinary website, so it opens behind
                company firewalls and VPNs. Rooms are deleted 24 hours after their last use.
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
      </main>
      <SiteFooter />
    </>
  );
}
