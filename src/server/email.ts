import "server-only";
import { Resend } from "resend";
import { logAction } from "@/lib/logger";

/** Fixed on purpose: visitor input never reaches an email header (SPEC §11.3). */
export const CONTACT_SUBJECT = "New message from your portfolio";
export const LOCKOUT_SUBJECT = "Admin login locked on your portfolio";

type Mail = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

/** Both variables must be set (SPEC §11.2 step 5); otherwise email is simply off. */
function config() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  return apiKey && from ? { apiKey, from } : null;
}

/** Sends one plain-text email. Never throws: the caller's work is already saved (SPEC §11.2). */
async function deliver(action: string, mail: Mail): Promise<void> {
  const settings = config();
  if (!settings) return;
  const startedAt = Date.now();
  try {
    const { error } = await new Resend(settings.apiKey).emails.send({
      from: settings.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    });
    if (error) {
      logAction({ action, ok: false, startedAt, code: "email_rejected" });
    }
  } catch {
    logAction({ action, ok: false, startedAt, code: "email_failed" });
  }
}

export async function sendContactNotification(
  message: {
    name: string;
    email: string;
    company: string | null;
    subject: string | null;
    body: string;
  },
  to: string,
): Promise<void> {
  const lines = [
    `From: ${message.name} <${message.email}>`,
    message.company ? `Company: ${message.company}` : null,
    message.subject ? `Subject: ${message.subject}` : null,
    "",
    message.body,
  ].filter((line) => line !== null);
  await deliver("sendContactNotification", {
    to,
    subject: CONTACT_SUBJECT,
    text: lines.join("\n"),
    replyTo: message.email,
  });
}

/** SPEC §12.2: told once when the global login lock engages. */
export async function sendLockoutAlert(to: string): Promise<void> {
  await deliver("sendLockoutAlert", {
    to,
    subject: LOCKOUT_SUBJECT,
    text: [
      "There were 30 failed admin login attempts within an hour, so login is locked for an hour.",
      "If this was not you, no action is needed: the password is not exposed. You can also use",
      "Settings → Log out of all devices after you next sign in.",
    ].join("\n"),
  });
}
