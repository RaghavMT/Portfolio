import { describe, expect, it } from "vitest";
import {
  ACCENTS,
  DEFAULT_SECTIONS,
  SECTION_KEYS,
  sectionsSchema,
  siteSettingsSchema,
} from "@/lib/validation/site-settings";
import { errorPaths } from "./helpers";

const valid = {
  fullName: "Test Person",
  headline: "Software Engineer",
  contactEmail: "test@example.com",
  seoDescription: "Portfolio of a test person.",
};

describe("siteSettingsSchema", () => {
  it("accepts the minimum required fields and fills defaults", () => {
    const parsed = siteSettingsSchema.parse(valid);
    expect(parsed).toMatchObject({
      tagline: null,
      openToWork: true,
      contactFormEnabled: true,
      aboutMd: "",
      accent: "indigo",
      seoTitle: null,
      sections: DEFAULT_SECTIONS,
    });
  });

  it("requires name, headline, contact email and SEO description", () => {
    expect(errorPaths(siteSettingsSchema, {}).sort()).toEqual(
      ["contactEmail", "fullName", "headline", "seoDescription"].sort(),
    );
  });

  it.each([
    ["fullName", 80],
    ["headline", 120],
    ["tagline", 240],
    ["location", 80],
    ["openToWorkText", 80],
    ["aboutMd", 4000],
    ["seoTitle", 70],
    ["seoDescription", 160],
  ])("limits %s to %i characters", (field, max) => {
    expect(
      errorPaths(siteSettingsSchema, { ...valid, [field]: "a".repeat(max) }),
    ).toEqual([]);
    expect(
      errorPaths(siteSettingsSchema, {
        ...valid,
        [field]: "a".repeat(max + 1),
      }),
    ).toEqual([field]);
  });

  it("only allows the fixed accent presets", () => {
    expect(ACCENTS).toEqual([
      "indigo",
      "blue",
      "teal",
      "emerald",
      "amber",
      "rose",
      "violet",
      "slate",
    ]);
    expect(
      errorPaths(siteSettingsSchema, { ...valid, accent: "pink" }),
    ).toEqual(["accent"]);
  });

  it("requires alt text when an avatar is set", () => {
    const avatarUrl = "https://example.com/me.webp";
    expect(errorPaths(siteSettingsSchema, { ...valid, avatarUrl })).toEqual([
      "avatarAlt",
    ]);
    expect(
      errorPaths(siteSettingsSchema, {
        ...valid,
        avatarUrl,
        avatarAlt: "Photo of me",
      }),
    ).toEqual([]);
  });

  it("rejects non-https media URLs", () => {
    expect(
      errorPaths(siteSettingsSchema, {
        ...valid,
        resumeUrl: "http://example.com/cv.pdf",
      }),
    ).toEqual(["resumeUrl"]);
  });
});

describe("sectionsSchema", () => {
  it("accepts every key exactly once, in any order", () => {
    expect(SECTION_KEYS).toHaveLength(7);
    const reversed = [...DEFAULT_SECTIONS]
      .reverse()
      .map((s) => ({ ...s, visible: false }));
    expect(sectionsSchema.safeParse(reversed).success).toBe(true);
  });

  it("rejects a missing key", () => {
    expect(sectionsSchema.safeParse(DEFAULT_SECTIONS.slice(1)).success).toBe(
      false,
    );
  });

  it("rejects a duplicated key", () => {
    const dup = [
      ...DEFAULT_SECTIONS.slice(0, 6),
      { key: "about", visible: true },
    ];
    expect(sectionsSchema.safeParse(dup).success).toBe(false);
  });

  it("rejects unknown keys and extra entries", () => {
    expect(
      sectionsSchema.safeParse([
        ...DEFAULT_SECTIONS.slice(0, 6),
        { key: "blog", visible: true },
      ]).success,
    ).toBe(false);
    expect(
      sectionsSchema.safeParse([
        ...DEFAULT_SECTIONS,
        { key: "about", visible: true },
      ]).success,
    ).toBe(false);
  });

  it("uses the default order About → Projects → Experience → Skills → Education → Certifications → Contact", () => {
    expect(DEFAULT_SECTIONS.map((s) => s.key)).toEqual([
      "about",
      "projects",
      "experience",
      "skills",
      "education",
      "certifications",
      "contact",
    ]);
  });
});
