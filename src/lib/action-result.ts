import { z } from "zod";

/** Field name → messages, as the forms expect them (SPEC §9.1: inline errors). */
export type FieldErrors = Record<string, string[]>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

/** Validation failure from a Zod parse: one generic message plus per-field messages. */
export function fail(error: z.ZodError): {
  ok: false;
  error: string;
  fieldErrors: FieldErrors;
} {
  const { fieldErrors } = z.flattenError(error);
  return {
    ok: false,
    error: "Fix the highlighted fields.",
    fieldErrors: fieldErrors as FieldErrors,
  };
}

export function failMessage(
  error: string,
  fieldErrors?: FieldErrors,
): { ok: false; error: string; fieldErrors?: FieldErrors } {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}

const GENERIC_ERROR =
  "Something went wrong. Nothing was saved — please try again.";

/** Postgres error code for unique_violation. */
const UNIQUE_VIOLATION = "23505";

type ConstraintMap = Record<string, { field: string; message: string }>;

function findUniqueViolation(error: unknown): string | null {
  for (let e = error, depth = 0; e && depth < 5; depth++) {
    if (typeof e === "object") {
      const { code, constraint, cause } = e as {
        code?: unknown;
        constraint?: unknown;
        cause?: unknown;
      };
      if (code === UNIQUE_VIOLATION && typeof constraint === "string") {
        return constraint;
      }
      e = cause;
    } else {
      break;
    }
  }
  return null;
}

/**
 * Turns a thrown DB error into a safe result: known unique constraints become a field error,
 * everything else a generic message. Raw DB text never reaches the client (SPEC §12.3).
 */
export function mapDbError(
  error: unknown,
  constraints: ConstraintMap,
): { ok: false; error: string; fieldErrors?: FieldErrors } {
  const constraint = findUniqueViolation(error);
  const known = constraint ? constraints[constraint] : undefined;
  if (known) {
    return failMessage(known.message, { [known.field]: [known.message] });
  }
  return failMessage(GENERIC_ERROR);
}
