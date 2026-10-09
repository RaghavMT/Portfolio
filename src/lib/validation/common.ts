import { z } from "zod";

/**
 * Field building blocks shared by every entity schema (SPEC §7.1).
 * Forms send "" for empty inputs; optional fields turn that into null so the DB stores NULL.
 */

const blankToNull = (value: unknown) =>
  value === undefined || (typeof value === "string" && value.trim() === "")
    ? null
    : value;

/** Wraps a non-null schema so "", whitespace, null and undefined all parse to null. */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess(blankToNull, schema.nullable());
}

const tooLong = (max: number) => `Keep it under ${max + 1} characters`;

export const requiredText = (max: number) =>
  z.string().trim().min(1, "Required").max(max, tooLong(max));

export const optionalText = (max: number) =>
  optional(z.string().trim().max(max, tooLong(max)));

/** Markdown body: never null, empty string when unset. */
export const markdown = (max: number) =>
  z.string().trim().max(max, tooLong(max)).default("");

/** Upper bound for any stored URL; generous, but stops junk payloads. */
const URL_MAX_LENGTH = 2048;

function hasProtocol(value: string, protocol: "https:" | "mailto:") {
  try {
    const url = new URL(value);
    return (
      url.protocol === protocol &&
      (protocol === "mailto:" || url.hostname !== "")
    );
  } catch {
    return false;
  }
}

export const httpsUrl = z
  .string()
  .trim()
  .max(URL_MAX_LENGTH, "That link is too long")
  .refine((v) => hasProtocol(v, "https:"), "Use a full https:// link");

export const optionalHttpsUrl = optional(httpsUrl);

export const emailAddress = z
  .string()
  .trim()
  .max(254, "That email is too long")
  .pipe(z.email("Enter a valid email"));

export const mailtoUrl = z
  .string()
  .trim()
  .max(URL_MAX_LENGTH, "That link is too long")
  .refine(
    (v) =>
      hasProtocol(v, "mailto:") &&
      z.email().safeParse(v.slice("mailto:".length)).success,
    "Use mailto: followed by a valid email",
  );

/**
 * Month-precision date (SPEC §7.1): accepts "YYYY-MM" (from <input type="month">) or "YYYY-MM-DD"
 * and normalises to "YYYY-MM-01".
 */
export const monthDate = z
  .string()
  .trim()
  .regex(
    /^(19[5-9]\d|20\d\d|2100)-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/,
    "Pick a month",
  )
  .transform((v) => `${v.slice(0, 7)}-01`);

export const optionalMonthDate = optional(monthDate);

/** List of short strings: trimmed, empties dropped, duplicates kept (e.g. highlight bullets). */
export const textList = (maxCount: number, maxLength: number) =>
  z
    .array(z.string())
    .default([])
    .transform((items) => items.map((s) => s.trim()).filter(Boolean))
    .pipe(
      z
        .array(z.string().max(maxLength, tooLong(maxLength)))
        .max(maxCount, `At most ${maxCount}`),
    );

/** Tags: like textList, plus case-insensitive de-duplication (first spelling wins). */
export const tagList = (maxCount: number, maxLength: number) =>
  z
    .array(z.string())
    .default([])
    .transform((items) => {
      const seen = new Set<string>();
      return items
        .map((s) => s.trim())
        .filter((s) => {
          const key = s.toLowerCase();
          if (!s || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    })
    .pipe(
      z
        .array(z.string().max(maxLength, tooLong(maxLength)))
        .max(maxCount, `At most ${maxCount} tags`),
    );

/** Adds an issue on `endField` when both dates are set and end < start. Month dates compare as strings. */
export function endNotBeforeStart<K extends string>(
  startField: K,
  endField: K,
) {
  return (value: Record<K, string | null>, ctx: z.RefinementCtx) => {
    const start = value[startField];
    const end = value[endField];
    if (start && end && end < start) {
      ctx.addIssue({
        code: "custom",
        path: [endField],
        message: "Can't end before it starts",
      });
    }
  };
}

/** Adds an issue on `altField` when an image URL is set without alt text. */
export function altRequiredWithImage<K extends string>(
  urlField: K,
  altField: K,
) {
  return (value: Record<K, string | null>, ctx: z.RefinementCtx) => {
    if (value[urlField] && !value[altField]) {
      ctx.addIssue({
        code: "custom",
        path: [altField],
        message: "Describe the image for screen readers",
      });
    }
  };
}
