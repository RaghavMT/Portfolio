/** Contact-form spam rules (SPEC §11.2). Pure, so the server action and the tests share them. */

export const MIN_FILL_MS = 3000;
export const IP_HOURLY_LIMIT = 3;
export const DAILY_LIMIT = 20;

/** Shown after a send, and after a silently dropped bot submission (SPEC §11.2 step 6). */
export const CONTACT_SUCCESS = "Thanks — I'll reply within 2 working days.";

/**
 * True when the submission should be dropped silently: honeypot filled, sent under 3 s after the
 * form rendered, or a render stamp that is missing, malformed or in the future (a script that never
 * ran the browser code can't have set one).
 */
export function isBotSubmission(input: {
  website: string | null | undefined;
  renderedAt: string | null | undefined;
  now: number;
}): boolean {
  if (input.website) return true;
  if (!input.renderedAt) return true;
  const rendered = Number(input.renderedAt);
  if (!Number.isFinite(rendered)) return true;
  const elapsed = input.now - rendered;
  return elapsed < MIN_FILL_MS;
}

/** 3 messages per IP hash per hour, 20 from everyone per day (§11.2 step 3). */
export function contactLimitReached(counts: {
  ipLastHour: number;
  allLastDay: number;
}): boolean {
  return (
    counts.ipLastHour >= IP_HOURLY_LIMIT || counts.allLastDay >= DAILY_LIMIT
  );
}

/** `mailto:` link for the admin "Reply" button (SPEC §9.8): subject "Re: …", never doubled. */
export function replyMailto(email: string, subject: string | null): string {
  const base = subject?.trim() ? subject.trim() : "Your message";
  const withPrefix = /^re:\s*/i.test(base) ? base : `Re: ${base}`;
  return `mailto:${email}?subject=${encodeURIComponent(withPrefix)}`;
}
