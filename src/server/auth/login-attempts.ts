import "server-only";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { db } from "../db/client";
import { loginAttempts } from "../db/schema";
import {
  evaluateLock,
  GLOBAL_WINDOW_MS,
  IP_WINDOW_MS,
  type LockState,
} from "./rate-limit";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

async function failuresSince(since: Date, ipHash?: string) {
  const [row] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.success, false),
        gt(loginAttempts.createdAt, since),
        ipHash ? eq(loginAttempts.ipHash, ipHash) : undefined,
      ),
    );
  return row?.n ?? 0;
}

export async function getLockState(ipHash: string): Promise<LockState> {
  const now = Date.now();
  const [ipFailures, globalFailures] = await Promise.all([
    failuresSince(new Date(now - IP_WINDOW_MS), ipHash),
    failuresSince(new Date(now - GLOBAL_WINDOW_MS)),
  ]);
  return evaluateLock({ ipFailures, globalFailures });
}

/** Stores the attempt and opportunistically prunes rows older than 30 days (SPEC §7.2). */
export async function recordAttempt(ipHash: string, success: boolean) {
  await db.insert(loginAttempts).values({ ipHash, success });
  await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.createdAt, new Date(Date.now() - RETENTION_MS)));
}
