import { describe, expect, it } from "vitest";
import { projectImageSchema } from "@/lib/validation/project-image";
import { projectSchema } from "@/lib/validation/project";
import { errorPaths } from "./helpers";

const valid = {
  slug: "my-project",
  title: "My Project",
  summary: "A short summary for the card.",
};

describe("projectSchema", () => {
  it("accepts minimal input and fills defaults", () => {
    expect(projectSchema.parse(valid)).toMatchObject({
      role: null,
      problemMd: "",
      approachMd: "",
      outcomeMd: "",
      tech: [],
      coverImageUrl: null,
      liveUrl: null,
      status: "draft",
      featured: false,
      startedOn: null,
      endedOn: null,
    });
  });

  it.each(["admin", "new", "edit", "api", "Bad Slug", "a".repeat(81), ""])(
    "rejects slug %j",
    (slug) => {
      expect(errorPaths(projectSchema, { ...valid, slug })).toEqual(["slug"]);
    },
  );

  it.each([
    ["title", 100],
    ["summary", 200],
    ["role", 80],
    ["problemMd", 3000],
    ["approachMd", 5000],
    ["outcomeMd", 3000],
  ])("limits %s to %i characters", (field, max) => {
    expect(
      errorPaths(projectSchema, { ...valid, [field]: "a".repeat(max) }),
    ).toEqual([]);
    expect(
      errorPaths(projectSchema, { ...valid, [field]: "a".repeat(max + 1) }),
    ).toEqual([field]);
  });

  it("limits tech to 20 tags of 30 chars, de-duplicated", () => {
    const tech = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    expect(errorPaths(projectSchema, { ...valid, tech })).toEqual(["tech"]);
    expect(
      projectSchema.parse({ ...valid, tech: ["Go", "go", "Rust"] }).tech,
    ).toEqual(["Go", "Rust"]);
  });

  it.each(["liveUrl", "repoUrl", "caseStudyUrl"])(
    "requires https for %s",
    (field) => {
      expect(
        errorPaths(projectSchema, { ...valid, [field]: "http://example.com" }),
      ).toEqual([field]);
      expect(
        errorPaths(projectSchema, { ...valid, [field]: "javascript:alert(1)" }),
      ).toEqual([field]);
    },
  );

  it("requires alt text when a cover image is set", () => {
    expect(
      errorPaths(projectSchema, {
        ...valid,
        coverImageUrl: "https://example.com/c.webp",
      }),
    ).toEqual(["coverImageAlt"]);
  });

  it("requires the end date to be on or after the start date", () => {
    expect(
      errorPaths(projectSchema, {
        ...valid,
        startedOn: "2025-05",
        endedOn: "2025-04",
      }),
    ).toEqual(["endedOn"]);
    expect(
      errorPaths(projectSchema, {
        ...valid,
        startedOn: "2025-05",
        endedOn: "2025-05",
      }),
    ).toEqual([]);
    expect(
      errorPaths(projectSchema, { ...valid, startedOn: "2025-05" }),
    ).toEqual([]);
  });

  it("only allows draft or published", () => {
    expect(errorPaths(projectSchema, { ...valid, status: "archived" })).toEqual(
      ["status"],
    );
  });
});

describe("projectImageSchema", () => {
  const image = {
    url: "https://example.com/g.webp",
    alt: "Dashboard screenshot",
  };

  it("requires an https url and alt text", () => {
    expect(errorPaths(projectImageSchema, image)).toEqual([]);
    expect(errorPaths(projectImageSchema, { ...image, alt: "" })).toEqual([
      "alt",
    ]);
    expect(
      errorPaths(projectImageSchema, {
        ...image,
        url: "http://example.com/g.webp",
      }),
    ).toEqual(["url"]);
  });

  it("limits alt to 160 and caption to 200 characters", () => {
    expect(
      errorPaths(projectImageSchema, { ...image, alt: "a".repeat(161) }),
    ).toEqual(["alt"]);
    expect(
      errorPaths(projectImageSchema, { ...image, caption: "a".repeat(201) }),
    ).toEqual(["caption"]);
  });
});
