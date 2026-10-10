import "server-only";
import { and, count, eq, gt } from "drizzle-orm";
import { db } from "./db/client";
import { messages } from "./db/schema";

/**
 * Contact-form rate limiting reuses `messages.ip_hash` + `created_at` (SPEC §7.2 `contact_rate`):
 * rows from this IP in the last hour, and from anyone in the last 24 hours.
 */
export async function countRecentMessages(ipHash: string) {
  const now = Date.now();
  const [ip, all] = await Promise.all([
    db
      .select({ n: count() })
      .from(messages)
      .where(
        and(
          eq(messages.ipHash, ipHash),
          gt(messages.createdAt, new Date(now - 60 * 60 * 1000)),
        ),
      ),
    db
      .select({ n: count() })
      .from(messages)
      .where(gt(messages.createdAt, new Date(now - 24 * 60 * 60 * 1000))),
  ]);
  return { ipLastHour: ip[0]?.n ?? 0, allLastDay: all[0]?.n ?? 0 };
}

export type NewMessage = {
  name: string;
  email: string;
  company: string | null;
  subject: string | null;
  body: string;
  ipHash: string;
  userAgent: string | null;
};

export async function insertMessage(values: NewMessage) {
  const [row] = await db
    .insert(messages)
    .values(values)
    .returning({ id: messages.id });
  return row;
}
