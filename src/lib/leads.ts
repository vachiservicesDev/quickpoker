import "server-only";
import { newSecret } from "./ids";
import { emailOwner, emailVisitor, looksLikeEmail, siteUrl } from "./notify";
import { RoomError } from "./poker";
import { getStore, type Lead, type LeadKind } from "./store";

const KINDS: LeadKind[] = ["newsletter", "services", "waitlist", "toolkit", "board"];

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
}

export interface LeadResult {
  /** True when we sent a confirmation email the visitor still has to click. */
  confirmationSent: boolean;
}

/**
 * Saves a lead. Newsletter consent is double opt-in: the address only gets
 * marketing email after the person clicks the confirmation link.
 */
export async function captureLead(body: Record<string, unknown>): Promise<LeadResult> {
  const kind = KINDS.includes(body.kind as LeadKind) ? (body.kind as LeadKind) : null;
  if (!kind || kind === "board") throw new RoomError("Unknown form.");
  const email = text(body.email, 254)?.toLowerCase() ?? "";
  if (!looksLikeEmail(email)) throw new RoomError("Enter a valid email address.");
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) || null : null;
  if (kind === "services" && (!message || message.length < 3)) throw new RoomError("Tell us a little about what you need.");
  const lead: Lead = {
    kind,
    email,
    name: text(body.name, 100),
    company: text(body.company, 120),
    interest: text(body.interest, 60),
    message,
    source: text(body.source, 200),
    newsletter: kind === "newsletter" || body.newsletter === true,
    token: newSecret(),
  };
  await getStore().saveLead(lead);
  const confirmationSent = lead.newsletter ? await sendConfirmation(lead.email, lead.token) : false;
  if (kind !== "newsletter") {
    await emailOwner(
      `QuickPoker ${kind === "services" ? "service inquiry" : kind === "waitlist" ? "Team plan waitlist" : "toolkit request"}: ${lead.name ?? lead.email}`,
      [
        `Email: ${lead.email}`,
        `Name: ${lead.name ?? "not given"}`,
        `Company: ${lead.company ?? "not given"}`,
        `Interested in: ${lead.interest ?? "not given"}`,
        `Newsletter: ${lead.newsletter ? "yes (pending confirmation)" : "no"}`,
        `From page: ${lead.source ?? "unknown"}`,
        "",
        lead.message ?? "",
      ],
      lead.email,
    );
  }
  return { confirmationSent };
}

export function sendConfirmation(email: string, token: string): Promise<boolean> {
  return emailVisitor(
    email,
    "Confirm your QuickPoker newsletter subscription",
    [
      "Thanks for signing up for the QuickPoker newsletter: agile tips, new templates, certification and career guides, and product updates.",
      "",
      "Confirm your subscription here:",
      `${siteUrl()}/api/leads/confirm?token=${token}`,
      "",
      "If you didn't sign up, ignore this email and you won't hear from us.",
    ].join("\n"),
  );
}

/** Records a newsletter opt-in made while emailing a retro board. */
export async function boardLead(email: string, source: string): Promise<string> {
  const token = newSecret();
  await getStore().saveLead({ kind: "board", email, name: null, company: null, interest: null, message: null, source, newsletter: true, token });
  return token;
}
