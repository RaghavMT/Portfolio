import type { z } from "zod";

/** Field paths of every issue, e.g. ["coverImageAlt", "sections"]. Empty when valid. */
export function errorPaths(schema: z.ZodType, input: unknown): string[] {
  const result = schema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
}
