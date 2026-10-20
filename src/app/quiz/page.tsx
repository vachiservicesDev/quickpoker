import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { QUIZZES } from "@/lib/quizzes";

export const metadata: Metadata = {
  title: "Free Scrum and agile practice quizzes",
  description: "Free practice quizzes on Scrum fundamentals and agile estimation, with an explanation for every answer.",
};

export default function Quizzes() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 bg-subtle">
        <div className="container-page flex flex-col gap-10 py-16 md:py-24">
          <div className="flex max-w-3xl flex-col gap-5">
            <p className="t-eyebrow">Practice quizzes</p>
            <h1 className="t-h2">How well do you know Scrum?</h1>
            <p className="t-lead">Short quizzes based on the Scrum Guide, with the reasoning behind every answer. Good practice before a certification exam, an interview or your first Sprint as a Scrum Master.</p>
          </div>
          <ul className="grid gap-5 md:grid-cols-2">
            {QUIZZES.map((q) => (
              <li key={q.slug} className="card flex flex-col gap-2 p-6">
                <span className="t-label">{q.questions.length} questions · free</span>
                <h2 className="text-xl font-semibold">{q.title}</h2>
                <p className="flex-1 text-ink-2">{q.summary}</p>
                <Link href={`/quiz/${q.slug}`} className="btn btn-primary self-start">Start quiz</Link>
              </li>
            ))}
          </ul>
          <p className="max-w-3xl text-sm text-muted">
            Full-length mock exams are coming. <Link href="/pricing#waitlist" className="link">Join the waitlist</Link> to get them first.
            These quizzes are independent study aids and aren&apos;t affiliated with Scrum.org, Scrum Alliance or any certification body.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
