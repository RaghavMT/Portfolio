"use server";

import { fail } from "@/lib/action-result";
import { experienceSchema } from "@/lib/validation/experience";
import { requireAdmin } from "../../auth/require-admin";
import { listResource } from "../../admin/resource";
import { experiences } from "../../db/schema";

type Row = typeof experiences.$inferSelect;
const rows = listResource<Row>(experiences, "Experience entry");

export async function createExperience(input: unknown) {
  await requireAdmin();
  const parsed = experienceSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return rows.create("createExperience", parsed.data);
}

export async function updateExperience(id: unknown, input: unknown) {
  await requireAdmin();
  const parsed = experienceSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return rows.update("updateExperience", id, parsed.data);
}

export async function setExperienceVisible(id: unknown, visible: unknown) {
  await requireAdmin();
  return rows.setVisible("setExperienceVisible", id, visible);
}

export async function deleteExperience(id: unknown) {
  await requireAdmin();
  return rows.remove("deleteExperience", id);
}

export async function reorderExperience(ids: unknown) {
  await requireAdmin();
  return rows.reorder("reorderExperience", ids);
}
