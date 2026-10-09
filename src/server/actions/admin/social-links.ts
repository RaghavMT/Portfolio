"use server";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { fail, failMessage, ok } from "@/lib/action-result";
import { socialLinkSchema } from "@/lib/validation/social-link";
import { requireAdmin } from "../../auth/require-admin";
import { applyOrder } from "../../admin/crud";
import { runMutation as run } from "../../admin/run";
import { db } from "../../db/client";
import { socialLinks } from "../../db/schema";

const idSchema = z.uuid();

export async function createSocialLink(input: unknown) {
  await requireAdmin();
  const parsed = socialLinkSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return run("createSocialLink", async () => {
    const [{ next }] = await db
      .select({
        next: sql<number>`coalesce(max(${socialLinks.sortOrder}), -1) + 1`,
      })
      .from(socialLinks);
    const [row] = await db
      .insert(socialLinks)
      .values({ ...parsed.data, sortOrder: next })
      .returning();
    return ok(row);
  });
}

export async function updateSocialLink(id: unknown, input: unknown) {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return failMessage("Link not found.");
  const parsed = socialLinkSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return run("updateSocialLink", async () => {
    const [row] = await db
      .update(socialLinks)
      .set(parsed.data)
      .where(eq(socialLinks.id, parsedId.data))
      .returning();
    return row ? ok(row) : failMessage("Link not found.");
  });
}

export async function setSocialLinkVisible(id: unknown, visible: unknown) {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  const parsedVisible = z.boolean().safeParse(visible);
  if (!parsedId.success || !parsedVisible.success) {
    return failMessage("Link not found.");
  }
  return run("setSocialLinkVisible", async () => {
    const rows = await db
      .update(socialLinks)
      .set({ visible: parsedVisible.data })
      .where(eq(socialLinks.id, parsedId.data))
      .returning({ id: socialLinks.id });
    return rows.length ? ok(undefined) : failMessage("Link not found.");
  });
}

export async function deleteSocialLink(id: unknown) {
  await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return failMessage("Link not found.");
  return run("deleteSocialLink", async () => {
    const rows = await db
      .delete(socialLinks)
      .where(eq(socialLinks.id, parsedId.data))
      .returning({ id: socialLinks.id });
    return rows.length ? ok(undefined) : failMessage("Link not found.");
  });
}

export async function reorderSocialLinks(ids: unknown) {
  await requireAdmin();
  const parsed = z.array(idSchema).safeParse(ids);
  if (!parsed.success) return failMessage("Couldn't save the new order.");
  return run("reorderSocialLinks", async () => {
    const existing = await db.select({ id: socialLinks.id }).from(socialLinks);
    const saved = await applyOrder(
      socialLinks,
      existing.map((r) => r.id),
      parsed.data,
    );
    return saved
      ? ok(undefined)
      : failMessage("The list changed — reload the page and try again.");
  });
}
