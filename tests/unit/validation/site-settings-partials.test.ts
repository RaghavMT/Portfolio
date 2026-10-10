import { describe, expect, it } from "vitest";
import {
  appearanceSchema,
  contactFormSchema,
  profileSchema,
  resumeSchema,
  seoSchema,
} from "@/lib/validation/site-settings";
import { errorPaths } from "./helpers";

// Partial schemas used by the admin Profile and Settings forms: each one may only ever carry its own
// columns, so a tampered payload can never reach session_version, resume_* or avatar_* (SPEC §12.3).
const forbidden = {
  sessionVersion: 99,
  resumeUrl: "https://example.com/r.pdf",
  resumeUpdatedAt: "2020-01-01",
  id: 2,
};
const BLOB = "https://abc123.public.blob.vercel-storage.com";

describe("profileSchema", () => {
  it("keeps only the profile text fields and strips everything else", () => {
    const parsed = profileSchema.parse({
      fullName: "A",
      headline: "B",
      contactEmail: "a@b.co",
      ...forbidden,
      ogImageUrl: `${BLOB}/og/o-x.png`,
      accent: "rose",
      seoDescription: "x",
    });
    expect(Object.keys(parsed).sort()).toEqual(
      [
        "aboutMd",
        "avatarAlt",
        "avatarUrl",
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

  it("carries the avatar, which needs alt text and a Blob URL", () => {
    const base = { fullName: "A", headline: "B", contactEmail: "a@b.co" };
    expect(
      profileSchema.parse({
        ...base,
        avatarUrl: `${BLOB}/images/me-x.png`,
        avatarAlt: "Me",
      }),
    ).toMatchObject({ avatarUrl: `${BLOB}/images/me-x.png`, avatarAlt: "Me" });
    expect(
      errorPaths(profileSchema, {
        ...base,
        avatarUrl: `${BLOB}/images/me-x.png`,
      }),
    ).toEqual(["avatarAlt"]);
    expect(
      errorPaths(profileSchema, {
        ...base,
        avatarUrl: "https://evil.example.com/me.png",
        avatarAlt: "Me",
      }),
    ).toEqual(["avatarUrl"]);
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

describe("resumeSchema", () => {
  it("takes only a Blob PDF URL, or null to remove it", () => {
    expect(
      resumeSchema.parse({
        resumeUrl: `${BLOB}/resume/cv-x.pdf`,
        sessionVersion: 9,
      }),
    ).toEqual({ resumeUrl: `${BLOB}/resume/cv-x.pdf` });
    expect(resumeSchema.parse({ resumeUrl: "" })).toEqual({ resumeUrl: null });
    expect(
      errorPaths(resumeSchema, {
        resumeUrl: "https://evil.example.com/cv.pdf",
      }),
    ).toEqual(["resumeUrl"]);
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
    ).toEqual({ seoTitle: null, seoDescription: "d", ogImageUrl: null });
    expect(
      seoSchema.parse({
        seoDescription: "d",
        ogImageUrl: `${BLOB}/og/o-x.png`,
      }).ogImageUrl,
    ).toBe(`${BLOB}/og/o-x.png`);
    expect(
      errorPaths(seoSchema, {
        seoDescription: "d",
        ogImageUrl: "https://evil.example.com/o.png",
      }),
    ).toEqual(["ogImageUrl"]);
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
