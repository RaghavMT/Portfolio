import { describe, expect, it } from "vitest";
import { addTags, suggestTags } from "../../../src/lib/admin/tags";

describe("addTags", () => {
  it("splits on commas, trims and drops empties", () => {
    expect(addTags(["React"], " Next.js , , Postgres ")).toEqual([
      "React",
      "Next.js",
      "Postgres",
    ]);
  });

  it("de-duplicates case-insensitively, keeping the first spelling", () => {
    expect(addTags(["React"], "react, REACT, Vue")).toEqual(["React", "Vue"]);
  });

  it("returns the same list for blank input", () => {
    expect(addTags(["A"], "  ,  ")).toEqual(["A"]);
  });

  it("stops at the max count", () => {
    expect(addTags(["a", "b"], "c, d, e", { max: 3 })).toEqual(["a", "b", "c"]);
  });

  it("truncates nothing but skips tags longer than the max length", () => {
    expect(addTags([], "ok, " + "x".repeat(31), { maxLength: 30 })).toEqual([
      "ok",
    ]);
  });
});

describe("suggestTags", () => {
  const all = ["React", "Redux", "Postgres", "react-query"];

  it("matches by case-insensitive prefix/substring, excluding chosen tags", () => {
    expect(suggestTags(all, ["React"], "re")).toEqual(["Redux", "react-query"]);
  });

  it("returns nothing for an empty query", () => {
    expect(suggestTags(all, [], "")).toEqual([]);
  });

  it("caps the number of suggestions", () => {
    expect(suggestTags(all, [], "r", 2)).toHaveLength(2);
  });
});
