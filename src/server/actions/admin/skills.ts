"use server";

import { fail } from "@/lib/action-result";
import { skillGroupSchema, skillSchema } from "@/lib/validation/skill";
import { requireAdmin } from "../../auth/require-admin";
import { listResource } from "../../admin/resource";
import { addSkill, removeSkill, reorderGroupSkills } from "../../admin/skills";
import { skillGroups, type SkillGroup } from "../../db/schema";

const groups = listResource<SkillGroup>(skillGroups, "Skill group");

export async function createSkillGroup(input: unknown) {
  await requireAdmin();
  const parsed = skillGroupSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return groups.create("createSkillGroup", parsed.data);
}

export async function updateSkillGroup(id: unknown, input: unknown) {
  await requireAdmin();
  const parsed = skillGroupSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return groups.update("updateSkillGroup", id, parsed.data);
}

export async function setSkillGroupVisible(id: unknown, visible: unknown) {
  await requireAdmin();
  return groups.setVisible("setSkillGroupVisible", id, visible);
}

/** Cascades to the group's skills in the DB. */
export async function deleteSkillGroup(id: unknown) {
  await requireAdmin();
  return groups.remove("deleteSkillGroup", id);
}

export async function reorderSkillGroups(ids: unknown) {
  await requireAdmin();
  return groups.reorder("reorderSkillGroups", ids);
}

export async function createSkill(groupId: unknown, input: unknown) {
  await requireAdmin();
  const parsed = skillSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return addSkill("createSkill", groupId, parsed.data);
}

export async function deleteSkill(id: unknown) {
  await requireAdmin();
  return removeSkill("deleteSkill", id);
}

export async function reorderSkills(groupId: unknown, ids: unknown) {
  await requireAdmin();
  return reorderGroupSkills("reorderSkills", groupId, ids);
}
