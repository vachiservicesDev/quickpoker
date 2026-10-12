import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuizRunner } from "@/components/QuizRunner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { QUIZZES } from "@/lib/quizzes";

export function generateStaticParams() {
  return QUIZZES.map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({ params }: PageProps<"/quiz/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const q = QUIZZES.find((x) => x.slug === slug);
  return q ? { title: `${q.title} practice quiz`, description: q.summary } : {};
}

export default async function QuizPage({ params }: PageProps<"/quiz/[slug]">) {
  const { slug } = await params;
  const quiz = QUIZZES.find((x) => x.slug === slug);
  if (!quiz) notFound();
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 bg-subtle">
        <div className="container-page flex max-w-3xl flex-col gap-6 py-16 md:py-24">
          <Link href="/quiz" className="link text-sm">← All quizzes</Link>
          <h1 className="t-h2">{quiz.title}</h1>
          <p className="t-lead">{quiz.summary}</p>
          <QuizRunner quiz={quiz} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
