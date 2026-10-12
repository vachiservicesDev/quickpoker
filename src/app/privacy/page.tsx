import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 bg-canvas">
        <div className="container-page flex max-w-3xl flex-col gap-5 py-16 md:py-24 text-ink-2">
          <p className="t-eyebrow">Privacy</p>
          <h1 className="t-h2">What we keep, and for how long.</h1>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>There are no accounts. In a room we store the display name you type, your votes, and the stories you add.</li>
            <li>Rooms and everything in them are deleted 24 hours after the room was last used.</li>
            <li>Your browser keeps a private key for each room you join, so a refresh keeps your seat. Clearing site data removes it.</li>
            <li>Feedback messages are kept until we have read and acted on them. Leaving contact details is optional.</li>
            <li>
              If you sign up for the newsletter, ask about our services, join a waitlist or email yourself a board, we keep your
              email address and anything you typed in the form. We use it to answer you and, only if you said yes and confirmed by
              email, to send the newsletter. Every newsletter has a one-click unsubscribe link.
            </li>
            <li>Unconfirmed newsletter sign-ups are deleted after 30 days. To have your details deleted, email info@vachiservices.com.</li>
            <li>We never sell or share your details. Emails are sent through our email provider, Resend.</li>
            <li>We don&apos;t use advertising or tracking cookies.</li>
            <li>If you turn on the AI summary for a retro board, the board&apos;s cards and action items are sent to Anthropic&apos;s Claude API to write the summary. By default, Anthropic doesn&apos;t use API data to train its models.</li>
          </ul>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
