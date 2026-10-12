import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsletterForm } from "@/components/NewsletterForm";
import { PrintButton } from "@/components/PrintButton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { RESOURCES } from "@/lib/toolkit";

export function generateStaticParams() {
  return RESOURCES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: PageProps<"/toolkit/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const r = RESOURCES.find((x) => x.slug === slug);
  return r ? { title: r.title, description: r.summary } : {};
}

export default async function Guide({ params }: PageProps<"/toolkit/[slug]">) {
  const { slug } = await params;
  const r = RESOURCES.find((x) => x.slug === slug);
  if (!r) notFound();
  return (
    <>
      <div className="print:hidden"><SiteHeader /></div>
      <main id="main" className="flex-1 bg-canvas">
        <article className="container-page flex max-w-3xl flex-col gap-6 py-16 md:py-24 print:py-0">
          <Link href="/toolkit" className="link text-sm print:hidden">← Facilitator toolkit</Link>
          <h1 className="t-h2">{r.title}</h1>
          <p className="t-lead">{r.summary}</p>
          <PrintButton />
          {r.sections.map((s) => (
            <section key={s.heading} className="flex flex-col gap-2 print:break-inside-avoid">
              <h2 className="text-xl font-semibold">{s.heading}</h2>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-ink-2">
                {s.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </section>
          ))}
          <p className="hidden text-sm text-muted print:block">From the free QuickPoker facilitator toolkit by Vachi Services.</p>
          <div className="card flex flex-col gap-3 p-6 print:hidden">
            <NewsletterForm source={`/toolkit/${r.slug}`} compact />
          </div>
        </article>
      </main>
      <div className="print:hidden"><SiteFooter /></div>
    </>
  );
}
