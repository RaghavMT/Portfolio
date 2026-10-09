"use server";

import { fail } from "@/lib/action-result";
import { educationSchema } from "@/lib/validation/education";
import { requireAdmin } from "../../auth/require-admin";
import { listResource } from "../../admin/resource";
import { education } from "../../db/schema";

type Row = typeof education.$inferSelect;
const rows = listResource<Row>(education, "Education entry");

export async function createEducation(input: unknown) {
  await requireAdmin();
  const parsed = educationSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return rows.create("createEducation", parsed.data);
}

export async function updateEducation(id: unknown, input: unknown) {
  await requireAdmin();
  const parsed = educationSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return rows.update("updateEducation", id, parsed.data);
}

export async function setEducationVisible(id: unknown, visible: unknown) {
  await requireAdmin();
  return rows.setVisible("setEducationVisible", id, visible);
}

export async function deleteEducation(id: unknown) {
  await requireAdmin();
  return rows.remove("deleteEducation", id);
}

export async function reorderEducation(ids: unknown) {
  await requireAdmin();
  return rows.reorder("reorderEducation", ids);
}
