"use server";

import { headers } from "next/headers";
import {
  CONTACT_SUCCESS,
  contactLimitReached,
  isBotSubmission,
} from "@/lib/contact-rules";
import { clientIp, hashIp } from "@/lib/ip-hash";
import { logAction } from "@/lib/logger";
import { messageSchema } from "@/lib/validation/message";
import { countRecentMessages, insertMessage } from "../contact";
import { sendContactNotification } from "../email";
import { getSettings } from "../queries/public";

export type ContactValues = {
  name: string;
  email: string;
  company: string;
  subject: string;
  body: string;
};

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** What the visitor typed, so a failed submit never loses their text. */
  values?: ContactValues;
};

const GENERIC_ERROR =
  "Something went wrong and your message was not sent. Please try again, or email me directly.";

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};

/**
 * Public by necessity (it is the contact form). Order follows SPEC §11.2: bots are dropped
 * silently, then validation, rate limit, insert, optional email, success.
 */
export async function sendMessage(
  _previous: ContactState,
  data: FormData,
): Promise<ContactState> {
  const startedAt = Date.now();
  const values: ContactValues = {
    name: text(data, "name"),
    email: text(data, "email"),
    company: text(data, "company"),
    subject: text(data, "subject"),
    body: text(data, "body"),
  };

  try {
    // 1. honeypot / too fast: pretend it worked, store nothing, count nothing
    if (
      isBotSubmission({
        website: text(data, "website"),
        renderedAt: text(data, "renderedAt"),
        now: Date.now(),
      })
    ) {
      logAction({
        action: "sendMessage",
        ok: true,
        startedAt,
        code: "dropped",
      });
      return { status: "success", message: CONTACT_SUCCESS };
    }

    const settings = await getSettings();
    if (!settings?.contactFormEnabled) {
      logAction({ action: "sendMessage", ok: false, startedAt, code: "off" });
      return {
        status: "error",
        message: "The contact form is switched off right now.",
        values,
      };
    }

    // 2. validate (the same schema the rest of the app uses)
    const parsed = messageSchema.safeParse(values);
    if (!parsed.success) {
      logAction({
        action: "sendMessage",
        ok: false,
        startedAt,
        code: "invalid",
      });
      const fieldErrors = parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >;
      return {
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors,
        values,
      };
    }

    // 3. rate limit per IP hash and overall
    const salt = process.env.IP_HASH_SALT;
    if (!salt) throw new Error("IP_HASH_SALT is not set");
    const requestHeaders = await headers();
    const ipHash = hashIp(clientIp(requestHeaders), salt);
    if (contactLimitReached(await countRecentMessages(ipHash))) {
      logAction({
        action: "sendMessage",
        ok: false,
        startedAt,
        code: "rate_limited",
      });
      return {
        status: "error",
        message: `Too many messages, please email me directly at ${settings.contactEmail}.`,
        values,
      };
    }

    // 4. insert
    await insertMessage({
      ...parsed.data,
      ipHash,
      userAgent: requestHeaders.get("user-agent")?.slice(0, 300) || null,
    });

    // 5. optional email: the message is already saved, so a failure is only logged
    try {
      await sendContactNotification(parsed.data, settings.contactEmail);
    } catch {
      logAction({
        action: "sendMessage",
        ok: false,
        startedAt,
        code: "email_failed",
      });
    }

    logAction({ action: "sendMessage", ok: true, startedAt });
    return { status: "success", message: CONTACT_SUCCESS };
  } catch {
    logAction({ action: "sendMessage", ok: false, startedAt, code: "error" });
    return { status: "error", message: GENERIC_ERROR, values };
  }
}
