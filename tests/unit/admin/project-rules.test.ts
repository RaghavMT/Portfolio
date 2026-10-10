import { describe, expect, it } from "vitest";
import {
  copyOf,
  nextPublishedAt,
  publishProblems,
  REQUIRE_COVER_ON_PUBLISH,
  uniqueSlug,
} from "@/lib/admin/project";
import { SLUG_MAX_LENGTH, isValidSlug } from "@/lib/slug";
import { projectFormSchema } from "@/lib/validation/project";
import { errorPaths } from "../validation/helpers";

const ready = { summary: "A summary", tech: ["TypeScript"] };

describe("publishProblems (SPEC §9.5 publish rule)", () => {
  const withCover = {
    ...ready,
    coverImageUrl: "https://x.test/a.png",
    coverImageAlt: "A screenshot",
  };

  it("passes with a summary, a technology and a cover with alt text", () => {
    expect(publishProblems(withCover)).toEqual([]);
  });

  it("flags a blank summary, an empty tech list and a missing cover", () => {
    const problems = publishProblems({ summary: "  ", tech: [] });
    expect(problems.map((p) => p.field).sort()).toEqual([
      "coverImageUrl",
      "summary",
      "tech",
    ]);
  });

  it("pins the cover-image switch: on since uploads exist (Phase 5, D27)", () => {
    expect(REQUIRE_COVER_ON_PUBLISH).toBe(true);
  });

  it("requires a cover by default and not when switched off", () => {
    expect(publishProblems(ready).map((p) => p.field)).toEqual([
      "coverImageUrl",
    ]);
    expect(publishProblems(ready, { requireCover: false })).toEqual([]);
  });

  it("requires cover image and alt when the rule is on", () => {
    expect(
      publishProblems(ready, { requireCover: true }).map((p) => p.field),
    ).toEqual(["coverImageUrl"]);
    expect(
      publishProblems(
        { ...ready, coverImageUrl: "https://x.test/a.png" },
        { requireCover: true },
      ).map((p) => p.field),
    ).toEqual(["coverImageAlt"]);
    expect(
      publishProblems(
        {
          ...ready,
          coverImageUrl: "https://x.test/a.png",
          coverImageAlt: "A screenshot",
        },
        { requireCover: true },
      ),
    ).toEqual([]);
  });
});

describe("nextPublishedAt", () => {
  const earlier = new Date("2026-01-01T00:00:00Z");
  const now = new Date("2026-10-10T00:00:00Z");

  it("sets it the first time a project is published", () => {
    expect(nextPublishedAt(null, "published", now)).toBe(now);
  });
  it("keeps the original date when published again", () => {
    expect(nextPublishedAt(earlier, "published", now)).toBe(earlier);
  });
  it("keeps it when unpublished and leaves drafts null", () => {
    expect(nextPublishedAt(earlier, "draft", now)).toBe(earlier);
    expect(nextPublishedAt(null, "draft", now)).toBeNull();
  });
});

describe("uniqueSlug", () => {
  it("returns the slug when free", () => {
    expect(uniqueSlug("my-app", ["other"])).toBe("my-app");
  });
  it("appends the next free number", () => {
    expect(uniqueSlug("my-app", ["my-app"])).toBe("my-app-2");
    expect(uniqueSlug("my-app", ["my-app", "my-app-2", "my-app-3"])).toBe(
      "my-app-4",
    );
  });
  it("keeps the result within 80 characters and valid", () => {
    const long = "a".repeat(SLUG_MAX_LENGTH);
    const slug = uniqueSlug(long, [long]);
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(slug).not.toBe(long);
    expect(isValidSlug(slug)).toBe(true);
  });
  it("never returns an empty or reserved slug", () => {
    expect(isValidSlug(uniqueSlug("", []))).toBe(true);
    expect(isValidSlug(uniqueSlug("admin", []))).toBe(true);
  });
});

describe("copyOf (Duplicate, SPEC §9.5)", () => {
  it("prefixes the title and derives a unique slug", () => {
    expect(copyOf("Portfolio Site", ["portfolio-site"])).toEqual({
      title: "Copy of Portfolio Site",
      slug: "copy-of-portfolio-site",
    });
  });
  it("avoids a slug that is already taken (copying a copy twice)", () => {
    expect(copyOf("Portfolio Site", ["copy-of-portfolio-site"])).toEqual({
      title: "Copy of Portfolio Site",
      slug: "copy-of-portfolio-site-2",
    });
  });
  it("truncates a long title to the 100-character limit", () => {
    const { title, slug } = copyOf("T".repeat(100), []);
    expect(title.length).toBeLessThanOrEqual(100);
    expect(title.startsWith("Copy of T")).toBe(true);
    expect(isValidSlug(slug)).toBe(true);
  });
});

describe("projectFormSchema", () => {
  const valid = { slug: "my-project", title: "T", summary: "S" };

  const blob = "https://abc123.public.blob.vercel-storage.com";

  it("carries cover and gallery (Phase 5) but still strips server-managed fields", () => {
    const parsed = projectFormSchema.parse({
      ...valid,
      coverImageUrl: `${blob}/images/a-x.png`,
      coverImageAlt: "alt",
      gallery: [{ url: `${blob}/images/b-x.png`, alt: "b" }],
      sortOrder: 5,
      publishedAt: "2020-01-01",
    });
    expect(parsed.coverImageUrl).toBe(`${blob}/images/a-x.png`);
    expect(parsed.gallery).toHaveLength(1);
    expect(Object.keys(parsed)).not.toContain("sortOrder");
    expect(Object.keys(parsed)).not.toContain("publishedAt");
  });

  it("defaults to no cover and an empty gallery", () => {
    expect(projectFormSchema.parse(valid)).toMatchObject({
      coverImageUrl: null,
      coverImageAlt: null,
      gallery: [],
    });
  });

  it("requires alt text with a cover and with every gallery image", () => {
    expect(
      errorPaths(projectFormSchema, {
        ...valid,
        coverImageUrl: `${blob}/images/a-x.png`,
      }),
    ).toEqual(["coverImageAlt"]);
    expect(
      errorPaths(projectFormSchema, {
        ...valid,
        gallery: [{ url: `${blob}/images/b-x.png`, alt: "" }],
      }),
    ).toEqual(["gallery.0.alt"]);
  });

  it("only accepts Vercel Blob URLs for images", () => {
    expect(
      errorPaths(projectFormSchema, {
        ...valid,
        coverImageUrl: "https://evil.example.com/a.png",
        coverImageAlt: "x",
        gallery: [{ url: "https://evil.example.com/b.png", alt: "x" }],
      }).sort(),
    ).toEqual(["coverImageUrl", "gallery.0.url"]);
  });

  it("allows at most 12 gallery images", () => {
    const gallery = Array.from({ length: 13 }, (_, i) => ({
      url: `${blob}/images/g${i}-x.png`,
      alt: "x",
    }));
    expect(errorPaths(projectFormSchema, { ...valid, gallery })).toEqual([
      "gallery",
    ]);
    expect(
      errorPaths(projectFormSchema, {
        ...valid,
        gallery: gallery.slice(0, 12),
      }),
    ).toEqual([]);
  });

  it("still enforces dates and required fields", () => {
    expect(
      errorPaths(projectFormSchema, {
        ...valid,
        startedOn: "2024-05",
        endedOn: "2024-01",
      }),
    ).toEqual(["endedOn"]);
    expect(errorPaths(projectFormSchema, {}).sort()).toEqual(
      ["slug", "summary", "title"].sort(),
    );
  });
});
