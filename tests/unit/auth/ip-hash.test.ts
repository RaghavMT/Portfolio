import { describe, expect, it } from "vitest";
import { clientIp, hashIp } from "@/lib/ip-hash";

describe("hashIp", () => {
  it("is 64 hex chars, stable, and salt-dependent", () => {
    const a = hashIp("1.2.3.4", "salt");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp("1.2.3.4", "salt")).toBe(a);
    expect(hashIp("1.2.3.4", "other")).not.toBe(a);
    expect(a).not.toContain("1.2.3.4");
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for hop", () => {
    expect(
      clientIp(new Headers({ "x-forwarded-for": " 9.9.9.9 , 1.1.1.1" })),
    ).toBe("9.9.9.9");
  });

  it("falls back to a constant when no header is present", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
