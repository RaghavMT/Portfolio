import { describe, expect, it } from "vitest";
import {
  profileChecklist,
  resumeStatus,
  STALE_RESUME_DAYS,
} from "@/lib/admin/dashboard";

const complete = {
  avatarUrl: "https://x.test/a.png",
  aboutMd: "I build things.",
  publishedProjects: 3,
  resumeUrl: "https://x.test/r.pdf",
  visibleSocialLinks: 1,
  seoDescription: "Software engineer in Delhi.",
};

const doneKeys = (input: Parameters<typeof profileChecklist>[0]) =>
  profileChecklist(input)
    .filter((i) => i.done)
    .map((i) => i.key);

describe("profileChecklist (SPEC §9.3)", () => {
  it("has six items, all done for a complete profile", () => {
    const items = profileChecklist(complete);
    expect(items.map((i) => i.key)).toEqual([
      "avatar",
      "about",
      "projects",
      "resume",
      "social",
      "seo",
    ]);
    expect(items.every((i) => i.done)).toBe(true);
  });

  it("links every item to the form that fixes it", () => {
    const hrefs = Object.fromEntries(
      profileChecklist(complete).map((i) => [i.key, i.href]),
    );
    expect(hrefs).toEqual({
      avatar: "/admin/profile",
      about: "/admin/profile",
      projects: "/admin/projects",
      resume: "/admin/profile#resume",
      social: "/admin/social",
      seo: "/admin/settings#seo",
    });
  });

  it.each([
    ["avatar", { avatarUrl: null }],
    ["about", { aboutMd: "   " }],
    ["projects", { publishedProjects: 2 }],
    ["resume", { resumeUrl: null }],
    ["social", { visibleSocialLinks: 0 }],
    ["seo", { seoDescription: "" }],
  ])("marks %s as not done when it is missing", (key, patch) => {
    expect(doneKeys({ ...complete, ...patch })).not.toContain(key);
    expect(doneKeys({ ...complete, ...patch })).toHaveLength(5);
  });

  it("needs at least 3 published projects", () => {
    expect(doneKeys({ ...complete, publishedProjects: 3 })).toContain(
      "projects",
    );
    expect(doneKeys({ ...complete, publishedProjects: 2 })).not.toContain(
      "projects",
    );
  });

  it("treats seed placeholder text starting with TODO as missing", () => {
    const keys = doneKeys({
      ...complete,
      aboutMd: "TODO: write about me",
      seoDescription: " todo: describe the site",
    });
    expect(keys).not.toContain("about");
    expect(keys).not.toContain("seo");
  });

  it("does not treat the word 'todo' inside real text as a placeholder", () => {
    expect(
      doneKeys({ ...complete, aboutMd: "I built a todo app and more." }),
    ).toContain("about");
  });
});

describe("resumeStatus (SPEC §9.3)", () => {
  const now = new Date("2026-10-10T00:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  it("is 'missing' without a résumé date", () => {
    expect(resumeStatus(null, now)).toEqual({ state: "missing" });
  });

  it("is fresh up to 90 days and stale from 91", () => {
    expect(STALE_RESUME_DAYS).toBe(90);
    expect(resumeStatus(daysAgo(90), now)).toEqual({
      state: "fresh",
      ageDays: 90,
    });
    expect(resumeStatus(daysAgo(91), now)).toEqual({
      state: "stale",
      ageDays: 91,
    });
  });

  it("counts whole days and never goes negative", () => {
    expect(resumeStatus(new Date(now.getTime() - 3_600_000), now)).toEqual({
      state: "fresh",
      ageDays: 0,
    });
    expect(resumeStatus(new Date(now.getTime() + 86_400_000), now)).toEqual({
      state: "fresh",
      ageDays: 0,
    });
  });
});
