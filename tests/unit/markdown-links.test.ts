import { describe, expect, it } from "vitest";
import { isExternalHref, safeHref } from "@/lib/markdown-links";

describe("safeHref", () => {
  it.each([
    "https://example.com/a",
    "http://example.com",
    "mailto:me@example.com",
    "/projects",
    "#about",
  ])("keeps %s", (href) => {
    expect(safeHref(href)).toBe(href);
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "data:text/html,<script>1</script>",
    "vbscript:x",
    "//evil.example.com",
    "",
  ])("drops %j", (href) => {
    expect(safeHref(href)).toBeUndefined();
  });

  it("drops undefined", () => {
    expect(safeHref(undefined)).toBeUndefined();
  });
});

describe("isExternalHref", () => {
  it("flags absolute http(s) links", () => {
    expect(isExternalHref("https://example.com")).toBe(true);
    expect(isExternalHref("http://example.com")).toBe(true);
  });
  it("does not flag relative, anchor or mailto", () => {
    expect(isExternalHref("/projects")).toBe(false);
    expect(isExternalHref("#x")).toBe(false);
    expect(isExternalHref("mailto:a@b.co")).toBe(false);
  });
});
