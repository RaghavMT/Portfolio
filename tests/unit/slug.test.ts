import { describe, expect, it } from "vitest";
import { isValidSlug, RESERVED_SLUGS, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and joins words with single hyphens", () => {
    expect(slugify("  My Cool   Project!! ")).toBe("my-cool-project");
  });

  it("strips accents and symbols", () => {
    expect(slugify("Café — Résumé Builder (v2)")).toBe(
      "cafe-resume-builder-v2",
    );
  });

  it("caps length at 80 without a trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(79)} bcd`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(slugify("!!! ???")).toBe("");
  });
});

describe("isValidSlug", () => {
  it.each(["portfolio", "my-project-2", "a1"])("accepts %s", (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it.each([
    "My-Project",
    "double--hyphen",
    "-leading",
    "trailing-",
    "has space",
    "under_score",
    "",
  ])("rejects %j", (slug) => {
    expect(isValidSlug(slug)).toBe(false);
  });

  it("rejects reserved slugs", () => {
    expect(RESERVED_SLUGS).toEqual(["new", "edit", "admin", "api"]);
    for (const slug of RESERVED_SLUGS) expect(isValidSlug(slug)).toBe(false);
  });

  it("rejects slugs longer than 80 characters", () => {
    expect(isValidSlug("a".repeat(80))).toBe(true);
    expect(isValidSlug("a".repeat(81))).toBe(false);
  });
});
