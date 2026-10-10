"use server";

import { z } from "zod";
import { fail, failMessage, ok } from "@/lib/action-result";
import { projectFormSchema, slugSchema } from "@/lib/validation/project";
import { requireAdmin } from "../../auth/require-admin";
import {
  createProjectRow,
  deleteProjectRow,
  duplicateProjectRow,
  isSlugFree,
  reorderProjectRows,
  setProjectFeaturedRow,
  setProjectStatusRow,
  updateProjectRow,
} from "../../admin/projects";

export async function createProject(input: unknown) {
  await requireAdmin();
  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return createProjectRow("createProject", parsed.data);
}

export async function updateProject(id: unknown, input: unknown) {
  await requireAdmin();
  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return updateProjectRow("updateProject", id, parsed.data);
}

/** Quick publish / unpublish; "published" re-checks the publish rule. */
export async function setProjectStatus(id: unknown, status: unknown) {
  await requireAdmin();
  return setProjectStatusRow("setProjectStatus", id, status);
}

export async function setProjectFeatured(id: unknown, featured: unknown) {
  await requireAdmin();
  return setProjectFeaturedRow("setProjectFeatured", id, featured);
}

export async function reorderProjects(ids: unknown) {
  await requireAdmin();
  return reorderProjectRows("reorderProjects", ids);
}

export async function duplicateProject(id: unknown) {
  await requireAdmin();
  return duplicateProjectRow("duplicateProject", id);
}

/** Cascades to the project's gallery rows; blob cleanup arrives with uploads (Phase 5). */
export async function deleteProject(id: unknown) {
  await requireAdmin();
  return deleteProjectRow("deleteProject", id);
}

/** Slug check for the form's blur handler. A read: no cache invalidation. */
export async function checkProjectSlug(slug: unknown, excludeId?: unknown) {
  await requireAdmin();
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return failMessage("Not a valid slug.");
  const exclude = z.uuid().safeParse(excludeId);
  return ok({
    free: await isSlugFree(
      parsed.data,
      exclude.success ? exclude.data : undefined,
    ),
  });
}
