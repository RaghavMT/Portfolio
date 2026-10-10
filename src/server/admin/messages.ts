import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  type ActionResult,
  failMessage,
  mapDbError,
  ok,
} from "@/lib/action-result";
import { logAction } from "@/lib/logger";
import { db } from "../db/client";
import { messages } from "../db/schema";

const idSchema = z.uuid();
const NOT_FOUND = "Message not found.";

/**
 * Inbox writes. Messages are private, not public content, so unlike `runMutation` these do NOT
 * invalidate the public cache (D36). Call only after `requireAdmin()`.
 */
async function run(
  action: string,
  id: unknown,
  work: (id: string) => Promise<boolean>,
): Promise<ActionResult<void>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return failMessage(NOT_FOUND);
  const startedAt = Date.now();
  try {
    const found = await work(parsed.data);
    logAction({ action, ok: found, startedAt });
    return found ? ok(undefined) : failMessage(NOT_FOUND);
  } catch (error) {
    logAction({ action, ok: false, startedAt, code: "db_error" });
    return mapDbError(error, {});
  }
}

export function setMessageRead(id: unknown, read: unknown) {
  const parsed = z.boolean().safeParse(read);
  if (!parsed.success) return Promise.resolve(failMessage(NOT_FOUND));
  return run("markMessageRead", id, async (messageId) => {
    const rows = await db
      .update(messages)
      .set({ readAt: parsed.data ? new Date() : null })
      .where(eq(messages.id, messageId))
      .returning({ id: messages.id });
    return rows.length > 0;
  });
}

export function setMessageArchived(id: unknown, archived: unknown) {
  const parsed = z.boolean().safeParse(archived);
  if (!parsed.success) return Promise.resolve(failMessage(NOT_FOUND));
  return run("archiveMessage", id, async (messageId) => {
    const rows = await db
      .update(messages)
      .set({ archived: parsed.data })
      .where(eq(messages.id, messageId))
      .returning({ id: messages.id });
    return rows.length > 0;
  });
}

export function removeMessage(id: unknown) {
  return run("deleteMessage", id, async (messageId) => {
    const rows = await db
      .delete(messages)
      .where(eq(messages.id, messageId))
      .returning({ id: messages.id });
    return rows.length > 0;
  });
}
