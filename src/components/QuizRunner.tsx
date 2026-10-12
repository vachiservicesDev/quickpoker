"use client";

import Link from "next/link";
import { useState } from "react";
import type { Quiz } from "@/lib/quizzes";
import { NewsletterForm } from "./NewsletterForm";

export function QuizRunner({ quiz }: { quiz: Quiz }) {
  const [picks, setPicks] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const score = picks.filter((p, i) => p === quiz.questions[i].answer).length;
  const answered = picks.every((p) => p !== null);

  return (
    <div className="flex flex-col gap-5">
      {submitted && (
        <div role="status" className="card flex flex-col gap-2 border-navy-700 p-6">
          <h2 className="text-2xl font-semibold">You scored {score} out of {quiz.questions.length}</h2>
          <p className="text-ink-2">
            {score === quiz.questions.length ? "Perfect score. You know this well." : score >= quiz.questions.length * 0.8 ? "Strong result. Read the explanations below for the ones you missed." : "Keep going. The explanations below show where to focus."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary" onClick={() => { setPicks(quiz.questions.map(() => null)); setSubmitted(false); window.scrollTo({ top: 0 }); }}>Try again</button>
            <Link href="/quiz" className="btn btn-ghost">More quizzes</Link>
          </div>
        </div>
      )}
      <ol className="flex flex-col gap-4">
        {quiz.questions.map((item, qi) => (
          <li key={qi} className="card p-5 md:p-6">
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 font-semibold">{qi + 1}. {item.q}</legend>
              {item.options.map((opt, oi) => {
                const chosen = picks[qi] === oi;
                const correct = submitted && oi === item.answer;
                const wrong = submitted && chosen && oi !== item.answer;
                return (
                  <label
                    key={oi}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 ${correct ? "border-green-700 bg-green-50" : wrong ? "border-danger-700 bg-danger-50" : chosen ? "border-navy-700 bg-navy-50" : "border-line"}`}
                  >
                    <input
                      type="radio"
                      name={`q${qi}`}
                      className="mt-1"
                      checked={chosen}
                      disabled={submitted}
                      onChange={() => setPicks(picks.map((p, i) => (i === qi ? oi : p)))}
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
              {submitted && <p className="text-sm text-ink-2"><strong>{picks[qi] === item.answer ? "Correct." : "Not quite."}</strong> {item.why}</p>}
            </fieldset>
          </li>
        ))}
      </ol>
      {!submitted ? (
        <button className="btn btn-primary btn-lg self-start" disabled={!answered} onClick={() => { setSubmitted(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          {answered ? "See my score" : `Answer all ${quiz.questions.length} questions to see your score`}
        </button>
      ) : (
        <div className="card flex flex-col gap-3 p-6">
          <NewsletterForm source={`/quiz/${quiz.slug}`} compact />
        </div>
      )}
    </div>
  );
}
