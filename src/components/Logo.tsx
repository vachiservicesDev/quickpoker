import Link from "next/link";

// Placeholder mark until the official Vachi logo file is supplied.
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-ink no-underline" aria-label="QuickPoker home">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="none" stroke="#1a5087" strokeWidth="2" />
        <path d="M16 6v3M16 23v3M6 16h3M23 16h3" stroke="#1a5087" strokeWidth="2" strokeLinecap="round" />
        <path d="M11.5 16.5l3 3 6-6.5" fill="none" stroke="#3b7e04" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-bold tracking-tight">QuickPoker</span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">by Vachi Services</span>
      </span>
    </Link>
  );
}
