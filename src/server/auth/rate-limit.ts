import "server-only";

/** SPEC §12.2: 5 failures per IP in 15 min; 30 failures from anyone in 1 h. */
export const IP_LIMIT = 5;
export const IP_WINDOW_MS = 15 * 60 * 1000;
export const GLOBAL_LIMIT = 30;
export const GLOBAL_WINDOW_MS = 60 * 60 * 1000;

export type LockState =
  { locked: false } | { locked: true; scope: "ip" | "global" };

export function evaluateLock(counts: {
  ipFailures: number;
  globalFailures: number;
}): LockState {
  if (counts.globalFailures >= GLOBAL_LIMIT) {
    return { locked: true, scope: "global" };
  }
  if (counts.ipFailures >= IP_LIMIT) return { locked: true, scope: "ip" };
  return { locked: false };
}

/** Constant-ish 300-500 ms pause after a failed attempt. */
export function failureDelayMs(random: () => number = Math.random): number {
  return 300 + Math.floor(random() * 201);
}

/** True when a failed attempt is the one that tipped the global lock on (email Raghav once, §12.2). */
export function justEngagedGlobalLock(
  before: LockState,
  after: LockState,
): boolean {
  const wasGlobal = before.locked && before.scope === "global";
  const isGlobal = after.locked && after.scope === "global";
  return isGlobal && !wasGlobal;
}
