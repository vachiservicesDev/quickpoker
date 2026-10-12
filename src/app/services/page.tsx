import type { Metadata } from "next";
import { LeadForm } from "@/components/LeadForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Agile coaching, facilitation and workshops",
  description: "Agile coaching, retro and PI planning facilitation, team workshops, health checks and Salesforce career coaching from Vachi Services.",
};

const SERVICES = [
  {
    name: "Agile coaching",
    price: "From $150 per session",
    text: "One-to-one or team coaching for Scrum Masters, Product Owners and new agile teams. Practical help with your real backlog and ceremonies.",
  },
  {
    name: "Done-for-you facilitation",
    price: "From $300 per session",
    text: "We run your retrospective, sprint planning or PI planning, so everyone on your team can take part. You get the board and action items afterwards.",
  },
  {
    name: "Live workshops",
    price: "$49 per seat, or private team sessions",
    text: "Two-hour online workshops: Run better retros, Estimation that works, and Writing stories your team can deliver.",
  },
  {
    name: "Team health check",
    price: "From $500 per team",
    text: "A structured survey and facilitated review of how your team works, with a short report and three priorities to improve.",
  },
  {
    name: "Salesforce career coaching",
    price: "From $99 per session",
    text: "Certification planning, career path advice and interview preparation for Salesforce admins, developers and consultants.",
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
            <h1 className="t-h2">Help from people who run these meetings every week.</h1>
            <p className="t-lead">QuickPoker is free. When your team wants more, Vachi Services offers coaching, facilitation and training.</p>
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
