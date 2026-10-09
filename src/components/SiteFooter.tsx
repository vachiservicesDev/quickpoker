import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-subtle">
      <div className="container-page flex flex-wrap justify-between gap-6 py-16 text-sm text-ink-2">
        <div className="flex max-w-[36rem] flex-col gap-4">
          <p>QuickPoker is free planning poker by Vachi Services LLC. Rooms are deleted 24 hours after their last use.</p>
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
        <nav aria-label="Footer" className="flex flex-wrap gap-6 self-start">
          <Link href="/about" className="link">About</Link>
          <Link href="/feedback" className="link">Feedback</Link>
          <Link href="/privacy" className="link">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
