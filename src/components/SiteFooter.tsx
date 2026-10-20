import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-subtle">
      <div className="container-page flex flex-wrap justify-between gap-6 py-16 text-sm text-ink-2">
        <div className="flex max-w-[36rem] flex-col gap-4">
          <p>QuickPoker is free planning poker and Sprint Retrospective boards for Scrum teams, by Vachi Services LLC. Rooms are deleted 24 hours after their last use.</p>
          <NewsletterForm source="footer" compact />
          <address className="not-italic leading-relaxed">
            Vachi Services LLC
            <br />
            83 Wooster Heights Rd, Suite 125
            <br />
            Danbury, CT 06810
            <br />
            <a href="mailto:info@vachiservices.com" className="link">info@vachiservices.com</a>
          </address>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 self-start">
          <Link href="/toolkit" className="link">Facilitator toolkit</Link>
          <Link href="/about" className="link">About</Link>
          <Link href="/quiz" className="link">Practice quizzes</Link>
          <Link href="/newsletter" className="link">Newsletter</Link>
          <Link href="/services" className="link">Coaching and services</Link>
          <Link href="/feedback" className="link">Feedback</Link>
          <Link href="/pricing" className="link">Pricing</Link>
          <Link href="/privacy" className="link">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
