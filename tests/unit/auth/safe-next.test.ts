import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

describe("safeNext", () => {
  it.each(["/admin", "/admin/projects", "/admin/projects/abc?x=1"])(
    "keeps %s",
    (p) => expect(safeNext(p)).toBe(p),
  );

  it.each([
    undefined,
    "",
    "/",
    "/administrator",
    "//evil.com",
    "/admin//evil.com",
    "https://evil.com/admin",
    "/admin\evil",
    "/admin/../x",
    "javascript:alert(1)",
    "admin",
  ])("falls back to /admin for %s", (p) => expect(safeNext(p)).toBe("/admin"));
});
