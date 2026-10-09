"use server";

import { fail } from "@/lib/action-result";
import { certificationSchema } from "@/lib/validation/certification";
import { requireAdmin } from "../../auth/require-admin";
import { listResource } from "../../admin/resource";
import { certifications } from "../../db/schema";

type Row = typeof certifications.$inferSelect;
const rows = listResource<Row>(certifications, "Certification");

export async function createCertification(input: unknown) {
  await requireAdmin();
  const parsed = certificationSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return rows.create("createCertification", parsed.data);
}

export async function updateCertification(id: unknown, input: unknown) {
  await requireAdmin();
  const parsed = certificationSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return rows.update("updateCertification", id, parsed.data);
}

export async function setCertificationVisible(id: unknown, visible: unknown) {
  await requireAdmin();
  return rows.setVisible("setCertificationVisible", id, visible);
}

export async function deleteCertification(id: unknown) {
  await requireAdmin();
  return rows.remove("deleteCertification", id);
}

export async function reorderCertifications(ids: unknown) {
  await requireAdmin();
  return rows.reorder("reorderCertifications", ids);
}
