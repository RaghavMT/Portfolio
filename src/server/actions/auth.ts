"use server";

import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp, hashIp } from "@/lib/ip-hash";
import { logAction } from "@/lib/logger";
import { safeNext } from "@/lib/safe-next";
import { db } from "../db/client";
import { siteSettings } from "../db/schema";
import { getLockState, recordAttempt } from "../auth/login-attempts";
import { verifyPassword } from "../auth/password";
import { failureDelayMs } from "../auth/rate-limit";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  sessionSecret,
  signSession,
} from "../auth/session";

export type LoginState = { error: string | null };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Public by necessity (it is the login). Rate-limited per SPEC §12.2; generic errors only. */
export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const startedAt = Date.now();
  const password = formData.get("password");
  const next = safeNext(String(formData.get("next") ?? ""));

  try {
    const salt = process.env.IP_HASH_SALT;
    if (!salt) throw new Error("IP_HASH_SALT is not set");
    const ipHash = hashIp(clientIp(await headers()), salt);

    if ((await getLockState(ipHash)).locked) {
      logAction({ action: "login", ok: false, startedAt, code: "locked" });
      return { error: "Too many attempts. Try again later." };
    }

    const valid =
      typeof password === "string" &&
      (await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH));
    await recordAttempt(ipHash, valid);

    if (!valid) {
      await sleep(failureDelayMs());
      logAction({
        action: "login",
        ok: false,
        startedAt,
        code: "bad_password",
      });
      return { error: "Incorrect password." };
    }

    const [row] = await db
      .select({ ver: siteSettings.sessionVersion })
      .from(siteSettings)
      .where(eq(siteSettings.id, 1));
    if (!row) throw new Error("site_settings row is missing");

    const token = await signSession(row.ver, sessionSecret());
    (await cookies()).set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(process.env.NODE_ENV === "production"),
    );
  } catch {
    logAction({ action: "login", ok: false, startedAt, code: "error" });
    return { error: "Login is unavailable right now. Try again later." };
  }

  logAction({ action: "login", ok: true, startedAt });
  redirect(next);
}

/** Clears the cookie; safe to call when logged out. */
export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}
