import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="container-page flex flex-1 flex-col items-start gap-4 py-24">
      <p className="t-eyebrow">Not found</p>
      <h1 className="t-h2">That page doesn&apos;t exist.</h1>
      <p className="t-lead">If you followed a room link, the room may have been deleted after 24 hours without use.</p>
      <Link href="/" className="btn btn-primary">Go to QuickPoker</Link>
    </main>
  );
}
