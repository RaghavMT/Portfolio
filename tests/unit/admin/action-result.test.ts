import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  fail,
  failMessage,
  mapDbError,
  ok,
} from "../../../src/lib/action-result";

describe("ok", () => {
  it("wraps data", () => {
    expect(ok({ id: 1 })).toEqual({ ok: true, data: { id: 1 } });
  });
});

describe("fail", () => {
  it("flattens a ZodError into per-field messages", () => {
    const parsed = z
      .object({ title: z.string().min(1, "Required"), url: z.url("Bad url") })
      .safeParse({ title: "", url: "nope" });
    if (parsed.success) throw new Error("expected failure");
    const result = fail(parsed.error);
    expect(result).toMatchObject({
      ok: false,
      error: "Fix the highlighted fields.",
      fieldErrors: { title: ["Required"], url: ["Bad url"] },
    });
  });

  it("builds a plain message failure with optional field errors", () => {
    expect(failMessage("Nope")).toEqual({ ok: false, error: "Nope" });
    expect(failMessage("Taken", { slug: ["Taken"] })).toEqual({
      ok: false,
      error: "Taken",
      fieldErrors: { slug: ["Taken"] },
    });
  });
});

describe("mapDbError", () => {
  const unique = (constraint: string) => ({ code: "23505", constraint });

  it("maps a known unique violation to a field error", () => {
    const result = mapDbError(unique("projects_slug_unique"), {
      projects_slug_unique: { field: "slug", message: "That slug is taken" },
    });
    expect(result).toEqual({
      ok: false,
      error: "That slug is taken",
      fieldErrors: { slug: ["That slug is taken"] },
    });
  });

  it("finds the violation on a wrapped cause", () => {
    const result = mapDbError(
      new Error("query failed", { cause: unique("skills_group_name_unique") }),
      {
        skills_group_name_unique: {
          field: "name",
          message: "Already in this group",
        },
      },
    );
    expect(result.fieldErrors).toEqual({ name: ["Already in this group"] });
  });

  it("never leaks raw database errors", () => {
    const result = mapDbError(
      new Error('relation "secret_table" does not exist'),
      {},
    );
    expect(result).toEqual({
      ok: false,
      error: "Something went wrong. Nothing was saved — please try again.",
    });
  });
});
