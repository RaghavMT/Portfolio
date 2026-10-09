import { describe, expect, it } from "vitest";
import { moveItem, sameIdSet } from "../../../src/lib/admin/reorder";

describe("sameIdSet", () => {
  it("accepts the same ids in any order", () => {
    expect(sameIdSet(["b", "a", "c"], ["a", "b", "c"])).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(sameIdSet(["a", "b"], ["a", "b", "c"])).toBe(false);
  });

  it("rejects an unknown id", () => {
    expect(sameIdSet(["a", "b", "x"], ["a", "b", "c"])).toBe(false);
  });

  it("rejects duplicates even when the length matches", () => {
    expect(sameIdSet(["a", "a", "b"], ["a", "b", "c"])).toBe(false);
  });

  it("accepts two empty lists", () => {
    expect(sameIdSet([], [])).toBe(true);
  });
});

describe("moveItem", () => {
  it("moves an item down and up without mutating the input", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(list, 2, 0)).toEqual(["c", "a", "b"]);
    expect(list).toEqual(["a", "b", "c"]);
  });

  it("returns the same order for a no-op or out-of-range move", () => {
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], -1, 0)).toEqual(["a", "b"]);
  });
});
