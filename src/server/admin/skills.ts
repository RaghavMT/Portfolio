import "server-only";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { type ActionResult, failMessage, ok } from "@/lib/action-result";
import type { SkillValues } from "@/lib/validation/skill";
import { applyOrder } from "./crud";
import { runMutation } from "./run";
import { db } from "../db/client";
import { skillGroups, skills, type Skill } from "../db/schema";

/**
 * Group-scoped skill writes (SPEC §9.7). Action files call these AFTER `requireAdmin()` and Zod
 * validation, same as `listResource`; group CRUD itself uses `listResource(skillGroups, …)`.
 */

const idSchema = z.uuid();

export const SKILL_CONSTRAINTS = {
  skills_group_name_unique: {
    field: "name",
    message: "That skill is already in this group.",
  },
};

export function addSkill(
  action: string,
  groupId: unknown,
  values: SkillValues,
): Promise<ActionResult<Skill>> {
  const parsedGroup = idSchema.safeParse(groupId);
  if (!parsedGroup.success) {
    return Promise.resolve(failMessage("Skill group not found."));
  }
  return runMutation(
    action,
    async () => {
      const [group] = await db
        .select({ id: skillGroups.id })
        .from(skillGroups)
        .where(eq(skillGroups.id, parsedGroup.data));
      if (!group) return failMessage("Skill group not found.");
      const [{ next }] = await db
        .select({
          next: sql<number>`coalesce(max(${skills.sortOrder}), -1) + 1`,
        })
        .from(skills)
        .where(eq(skills.groupId, group.id));
      const [row] = await db
        .insert(skills)
        .values({ ...values, groupId: group.id, sortOrder: next })
        .returning();
      return ok(row);
    },
    SKILL_CONSTRAINTS,
  );
}

export function removeSkill(
  action: string,
  id: unknown,
): Promise<ActionResult<void>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return Promise.resolve(failMessage("Skill not found."));
  return runMutation(action, async () => {
    const rows = await db
      .delete(skills)
      .where(eq(skills.id, parsed.data))
      .returning({ id: skills.id });
    return rows.length ? ok(undefined) : failMessage("Skill not found.");
  });
}

/** Reorders the skills of one group; the submitted ids must be exactly that group's skills. */
export function reorderGroupSkills(
  action: string,
  groupId: unknown,
  ids: unknown,
): Promise<ActionResult<void>> {
  const parsedGroup = idSchema.safeParse(groupId);
  const parsedIds = z.array(idSchema).safeParse(ids);
  if (!parsedGroup.success || !parsedIds.success) {
    return Promise.resolve(failMessage("Couldn't save the new order."));
  }
  return runMutation(action, async () => {
    const existing = await db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.groupId, parsedGroup.data));
    const saved = await applyOrder(
      skills,
      existing.map((r) => r.id),
      parsedIds.data,
    );
    return saved
      ? ok(undefined)
      : failMessage("The list changed — reload the page and try again.");
  });
}
