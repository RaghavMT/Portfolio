import { describe, expect, it } from "vitest";
import { pickHomeProjects, renderableSections } from "@/lib/sections";
import { DEFAULT_SECTIONS } from "@/lib/validation/site-settings";

const all = {
  projects: 2,
  experience: 1,
  skills: 1,
  education: 1,
  certifications: 1,
  about: 1,
};

describe("renderableSections", () => {
  it("keeps configured order", () => {
    const sections = [...DEFAULT_SECTIONS].reverse();
    expect(renderableSections(sections, all).map((s) => s.key)).toEqual([
      "contact",
      "certifications",
      "education",
      "skills",
      "experience",
      "projects",
      "about",
    ]);
  });

  it("drops hidden sections", () => {
    const sections = DEFAULT_SECTIONS.map((s) =>
      s.key === "education" ? { ...s, visible: false } : s,
    );
    expect(renderableSections(sections, all).map((s) => s.key)).not.toContain(
      "education",
    );
  });

  it("drops visible sections with no items, but keeps contact", () => {
    const keys = renderableSections(DEFAULT_SECTIONS, {
      ...all,
      skills: 0,
      projects: 0,
    }).map((s) => s.key);
    expect(keys).not.toContain("skills");
    expect(keys).not.toContain("projects");
    expect(keys).toContain("contact");
  });

  it("drops about when it has no text", () => {
    const keys = renderableSections(DEFAULT_SECTIONS, { ...all, about: 0 }).map(
      (s) => s.key,
    );
    expect(keys).not.toContain("about");
  });
});

const p = (id: number, featured: boolean) => ({ id, featured });

describe("pickHomeProjects", () => {
  it("shows featured projects only when some are featured", () => {
    const r = pickHomeProjects([p(1, false), p(2, true), p(3, true)]);
    expect(r.projects.map((x) => x.id)).toEqual([2, 3]);
    expect(r.hasMore).toBe(true);
  });

  it("caps featured at 6", () => {
    const list = Array.from({ length: 8 }, (_, i) => p(i, true));
    expect(pickHomeProjects(list).projects).toHaveLength(6);
  });

  it("falls back to the first 3 when none are featured", () => {
    const list = Array.from({ length: 5 }, (_, i) => p(i, false));
    const r = pickHomeProjects(list);
    expect(r.projects.map((x) => x.id)).toEqual([0, 1, 2]);
    expect(r.hasMore).toBe(true);
  });

  it("hasMore is false when everything is shown", () => {
    const r = pickHomeProjects([p(1, true), p(2, true)]);
    expect(r.hasMore).toBe(false);
  });
});
