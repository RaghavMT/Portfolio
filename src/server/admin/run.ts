import "server-only";
import { type ActionResult, mapDbError } from "@/lib/action-result";
import { logAction } from "@/lib/logger";
import { invalidateContent } from "../cache";

type Constraints = Parameters<typeof mapDbError>[1];

/**
 * Runs the write step of an admin action (SPEC §14.2 steps 3–5): on success the public cache is
 * invalidated AFTER the write; a thrown DB error becomes a safe result; one log line either way.
 * Call it only after `requireAdmin()` and input validation.
 */
export async function runMutation<T>(
  action: string,
  work: () => Promise<ActionResult<T>>,
  constraints: Constraints = {},
): Promise<ActionResult<T>> {
  const startedAt = Date.now();
  try {
    const result = await work();
    if (result.ok) invalidateContent();
    logAction({ action, ok: result.ok, startedAt });
    return result;
  } catch (error) {
    logAction({ action, ok: false, startedAt, code: "db_error" });
    return mapDbError(error, constraints);
  }
}
