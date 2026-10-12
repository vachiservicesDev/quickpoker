import type { Metadata } from "next";
import { LeadForm } from "@/components/LeadForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Agile coaching, facilitation and workshops",
  description: "Scrum coaching, Sprint event facilitation, team workshops, health checks and Scrum certification coaching from Vachi Services.",
};

const SERVICES = [
  {
    name: "Scrum coaching",
    price: "From $150 per session",
    text: "One-to-one or team coaching for Scrum Masters, Product Owners and new Scrum teams. We work on your real Product Backlog and your real Sprint events, not slides.",
  },
  {
    name: "Event facilitation",
    price: "From $300 per session",
    text: "A neutral facilitator for your Sprint Retrospective, Sprint Planning, refinement or PI Planning, so your Scrum Master can take part too. You keep the board and the action items.",
  },
  {
    name: "Live workshops",
    price: "$49 per seat, or private team sessions",
    text: "Two-hour online workshops: Retros that change something, Estimation without the arguments, and Backlog items your Developers can finish in a Sprint.",
  },
  {
    name: "Team health check",
    price: "From $500 per team",
    text: "A structured survey and facilitated review of how your Scrum Team works: goals, flow, quality and collaboration. You get a short report and three priorities to improve.",
  },
  {
    name: "Scrum certification and career coaching",
    price: "From $99 per session",
    text: "Study plans for Scrum Master and Product Owner certifications, mock interviews, and career advice for people moving into Scrum roles.",
  },
  {
    name: "White-label licence",
    price: "Yearly licence",
    text: "Consultancies and training companies can run QuickPoker under their own brand and domain for their clients.",
  },
];

export default function Services() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 bg-canvas">
        <div className="container-page flex flex-col gap-12 py-16 md:py-24">
          <div className="flex max-w-3xl flex-col gap-5">
            <p className="t-eyebrow">Services</p>
            <h1 className="t-h2">Help from people who facilitate Scrum events every week.</h1>
            <p className="t-lead">QuickPoker stays free. When your team wants an experienced hand, Vachi Services offers Scrum coaching, facilitation and training.</p>
          </div>
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <li key={s.name} className="card flex flex-col gap-2 p-6">
                <h2 className="text-xl font-semibold">{s.name}</h2>
                <p className="font-mono text-sm text-teal-700">{s.price}</p>
                <p className="text-ink-2">{s.text}</p>
              </li>
            ))}
          </ul>
          <section aria-labelledby="contact-h" className="flex max-w-3xl flex-col gap-4">
            <h2 id="contact-h" className="text-2xl font-semibold">Tell us what you need</h2>
            <p className="text-ink-2">We reply within two business days with options and a price.</p>
            <LeadForm
              kind="services"
              source="/services"
              interests={SERVICES.map((s) => s.name)}
              askMessage
              messageLabel="What would you like help with?"
              submitLabel="Send request"
              doneTitle="Thanks, we got your request."
              doneText="We'll reply to your email within two business days."
            />
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
