import Link from "next/link";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-canvas">
      <div className="container-page flex min-h-[76px] flex-wrap items-center justify-between gap-4 py-3">
        <Logo />
        <nav aria-label="Main" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] font-medium text-ink-2">
          <Link href="/#how-it-works" className="hover:text-navy-700">How it works</Link>
          <Link href="/#retros" className="hover:text-navy-700">Retros</Link>
          <Link href="/#company-networks" className="hover:text-navy-700">Company networks</Link>
          <Link href="/about" className="hover:text-navy-700">About</Link>
          <Link href="/feedback" className="hover:text-navy-700">Feedback</Link>
        </nav>
        <Link href="/#start" className="btn btn-primary">Start a free room</Link>
      </div>
    </header>
  );
}
