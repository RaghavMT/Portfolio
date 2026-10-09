import { describe, expect, it } from "vitest";
import {
  appearanceSchema,
  contactFormSchema,
  profileSchema,
  seoSchema,
} from "@/lib/validation/site-settings";
import { errorPaths } from "./helpers";

// Partial schemas used by the admin Profile and Settings forms: each one may only ever carry its own
// columns, so a tampered payload can never reach session_version, resume_* or avatar_* (SPEC §12.3).
const forbidden = {
  sessionVersion: 99,
  resumeUrl: "https://example.com/r.pdf",
  avatarUrl: "https://example.com/a.png",
  avatarAlt: "me",
  ogImageUrl: "https://example.com/o.png",
  id: 2,
};

describe("profileSchema", () => {
  it("keeps only the profile text fields and strips everything else", () => {
    const parsed = profileSchema.parse({
      fullName: "A",
      headline: "B",
      contactEmail: "a@b.co",
      ...forbidden,
      accent: "rose",
      seoDescription: "x",
    });
    expect(Object.keys(parsed).sort()).toEqual(
      [
        "aboutMd",
        "contactEmail",
        "fullName",
        "headline",
        "location",
        "openToWork",
        "openToWorkText",
        "tagline",
      ].sort(),
    );
  });

  it("requires name, headline and a valid email", () => {
    expect(errorPaths(profileSchema, {}).sort()).toEqual(
      ["contactEmail", "fullName", "headline"].sort(),
    );
    expect(
      errorPaths(profileSchema, {
        fullName: "A",
        headline: "B",
        contactEmail: "nope",
      }),
    ).toEqual(["contactEmail"]);
  });

  it("keeps the siteSettings limits", () => {
    expect(
      errorPaths(profileSchema, {
        fullName: "A".repeat(81),
        headline: "B",
        contactEmail: "a@b.co",
        aboutMd: "x".repeat(4001),
      }).sort(),
    ).toEqual(["aboutMd", "fullName"]);
  });
});

describe("appearanceSchema", () => {
  it("accepts only a known accent", () => {
    expect(appearanceSchema.parse({ accent: "teal", ...forbidden })).toEqual({
      accent: "teal",
    });
    expect(errorPaths(appearanceSchema, { accent: "hotpink" })).toEqual([
      "accent",
    ]);
  });
});

describe("seoSchema", () => {
  it("keeps title and description, with their limits", () => {
    expect(
      seoSchema.parse({ seoTitle: "", seoDescription: "d", ...forbidden }),
    ).toEqual({ seoTitle: null, seoDescription: "d" });
    expect(
      errorPaths(seoSchema, {
        seoTitle: "x".repeat(71),
        seoDescription: "x".repeat(161),
      }).sort(),
    ).toEqual(["seoDescription", "seoTitle"]);
    expect(errorPaths(seoSchema, {})).toEqual(["seoDescription"]);
  });
});

describe("contactFormSchema", () => {
  it("needs an explicit boolean", () => {
    expect(
      contactFormSchema.parse({ contactFormEnabled: false, ...forbidden }),
    ).toEqual({ contactFormEnabled: false });
    expect(errorPaths(contactFormSchema, {})).toEqual(["contactFormEnabled"]);
  });
});
