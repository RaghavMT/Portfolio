import { describe, expect, it } from "vitest";
import {
  GLOBAL_LIMIT,
  IP_LIMIT,
  evaluateLock,
  failureDelayMs,
  justEngagedGlobalLock,
} from "@/server/auth/rate-limit";

describe("evaluateLock", () => {
  it("allows up to four failures per IP", () => {
    expect(
      evaluateLock({ ipFailures: IP_LIMIT - 1, globalFailures: 4 }),
    ).toEqual({
      locked: false,
    });
  });

  it("locks an IP at five failures", () => {
    expect(evaluateLock({ ipFailures: IP_LIMIT, globalFailures: 5 })).toEqual({
      locked: true,
      scope: "ip",
    });
  });

  it("locks everyone at thirty failures overall", () => {
    expect(
      evaluateLock({ ipFailures: 0, globalFailures: GLOBAL_LIMIT }),
    ).toEqual({
      locked: true,
      scope: "global",
    });
  });

  it("uses the SPEC thresholds", () => {
    expect(IP_LIMIT).toBe(5);
    expect(GLOBAL_LIMIT).toBe(30);
  });
});

describe("failureDelayMs", () => {
  it("stays within 300-500 ms", () => {
    for (const r of [0, 0.5, 0.999999]) {
      const d = failureDelayMs(() => r);
      expect(d).toBeGreaterThanOrEqual(300);
      expect(d).toBeLessThanOrEqual(500);
    }
  });
});

describe("justEngagedGlobalLock (SPEC §12.2 lockout email)", () => {
  const open = { locked: false } as const;
  const ip = { locked: true, scope: "ip" } as const;
  const global = { locked: true, scope: "global" } as const;

  it("alerts only when a failure tips the lock from not-global to global", () => {
    expect(justEngagedGlobalLock(open, global)).toBe(true);
    expect(justEngagedGlobalLock(ip, global)).toBe(true);
  });

  it("stays quiet otherwise", () => {
    expect(justEngagedGlobalLock(open, open)).toBe(false);
    expect(justEngagedGlobalLock(open, ip)).toBe(false);
    expect(justEngagedGlobalLock(global, global)).toBe(false);
  });
});
