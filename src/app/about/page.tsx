import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "About",
  description: "QuickPoker is built by a Salesforce professional who wanted estimation to work on any company network.",
};

// High-level for now; the founder's career details will be filled in later.
export default function About() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 bg-canvas">
        <div className="container-page flex max-w-3xl flex-col gap-6 py-16 md:py-24">
          <p className="t-eyebrow">About</p>
          <h1 className="t-h2">Built by someone who sits in these meetings.</h1>
          <p className="t-lead">
            QuickPoker is made by a Salesforce professional with years of experience delivering CRM projects with agile
            teams, and a set of Salesforce certifications earned along the way.
          </p>
          <p className="text-ink-2">
            Too many estimation tools stopped working the moment a team joined from a company laptop on a VPN. QuickPoker
            is the tool we wanted: free, no sign-up, and built to open on any company network.
          </p>
          <section aria-labelledby="career-h" className="card flex flex-col gap-3 p-6 md:p-8">
            <h2 id="career-h" className="text-xl font-semibold">Salesforce career</h2>
            <p className="text-ink-2">[Career summary, years of experience and certifications to be added.]</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
