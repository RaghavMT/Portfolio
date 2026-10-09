import { z } from "zod";
import { requiredText } from "./common";

export const skillGroupSchema = z.object({
  name: requiredText(40),
  visible: z.boolean().default(true),
});

/** A chip inside a group; the group id comes from the route/action, not the form. Names are unique per group (case-insensitive, enforced in the DB). */
export const skillSchema = z.object({
  name: requiredText(40),
  visible: z.boolean().default(true),
});

export type SkillGroupValues = z.output<typeof skillGroupSchema>;
export type SkillValues = z.output<typeof skillSchema>;
