import type { Metadata } from "next";
import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Pricing",
  description: "QuickPoker is free for every team. A Team plan with saved history, Jira and Azure DevOps import and AI summaries is coming soon.",
};

const PLANS = [
  {
    name: "Free",
    price: "$0",
    note: "Forever",
    features: ["Planning poker and retro boards", "Up to 100 people per room", "Works behind company firewalls and VPNs", "Print, email and CSV export", "Rooms kept for 24 hours"],
    cta: { label: "Start a free room", href: "/#start" },
  },
  {
    name: "Team",
    price: "$12",
    note: "Per team, per month. Coming soon",
    features: ["Everything in Free", "Boards and estimates saved across sprints", "Import stories from Jira or Azure DevOps", "AI retro summaries with themes and actions", "Your team's logo and Excel export"],
    cta: { label: "Join the waitlist", href: "#waitlist" },
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "For companies and consultancies",
    features: ["Everything in Team", "White-label: your brand and domain", "Single sign-on and admin controls", "Facilitation and coaching hours included", "Invoice billing"],
    cta: { label: "Contact us", href: "/services" },
  },
];

export default function Pricing() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 bg-subtle">
        <div className="container-page flex flex-col gap-12 py-16 md:py-24">
          <div className="flex max-w-3xl flex-col gap-5">
            <p className="t-eyebrow">Pricing</p>
            <h1 className="t-h2">Free for every team. More when you need it.</h1>
            <p className="t-lead">Everything on QuickPoker today stays free. The Team plan adds history and integrations for teams that want them.</p>
          </div>
          <ul className="grid gap-5 lg:grid-cols-3">
            {PLANS.map((p) => (
              <li key={p.name} className={`card flex flex-col gap-4 p-6 md:p-8 ${p.name === "Team" ? "border-navy-700 shadow-[var(--shadow-panel)]" : ""}`}>
                <h2 className="text-xl font-semibold">{p.name}</h2>
                <p><span className="font-display text-4xl font-bold">{p.price}</span> <span className="text-sm text-muted">{p.note}</span></p>
                <ul className="flex flex-1 list-disc flex-col gap-1.5 pl-5 text-ink-2">
                  {p.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link href={p.cta.href} className={`btn ${p.name === "Team" ? "btn-primary" : "btn-secondary"} self-start`}>{p.cta.label}</Link>
              </li>
            ))}
          </ul>
          <section id="waitlist" aria-labelledby="waitlist-h" className="flex max-w-3xl scroll-mt-8 flex-col gap-4">
            <h2 id="waitlist-h" className="text-2xl font-semibold">Join the Team plan waitlist</h2>
            <p className="text-ink-2">Tell us which features matter most. Waitlist teams get early access and launch pricing.</p>
            <LeadForm
              kind="waitlist"
              source="/pricing"
              interests={["Saved history", "Jira import", "Azure DevOps import", "AI retro summaries", "Team logo and branding", "Mock certification exams"]}
              submitLabel="Join the waitlist"
              doneTitle="You're on the list."
              doneText="We'll email you when the Team plan opens."
            />
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
