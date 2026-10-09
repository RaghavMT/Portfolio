import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
  signSession,
  verifySession,
} from "@/server/auth/session";

const SECRET = "a".repeat(64);

describe("session token", () => {
  it("round-trips the version", async () => {
    const token = await signSession(3, SECRET);
    expect(await verifySession(token, SECRET)).toEqual({ ver: 3 });
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signSession(1, "b".repeat(64));
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const eightDaysAgo = Math.floor(Date.now() / 1000) - 8 * 24 * 3600;
    const token = await signSession(1, SECRET, eightDaysAgo);
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it("accepts a token that is almost seven days old", async () => {
    const sixDaysAgo = Math.floor(Date.now() / 1000) - 6 * 24 * 3600;
    const token = await signSession(1, SECRET, sixDaysAgo);
    expect(await verifySession(token, SECRET)).toEqual({ ver: 1 });
  });

  it("rejects garbage and empty input", async () => {
    expect(await verifySession("not-a-jwt", SECRET)).toBeNull();
    expect(await verifySession("", SECRET)).toBeNull();
    expect(await verifySession(undefined, SECRET)).toBeNull();
  });

  it("rejects an unsigned (alg none) token", async () => {
    const b64 = (o: object) =>
      Buffer.from(JSON.stringify(o)).toString("base64url");
    const forged = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "admin", ver: 1, exp: 9999999999 })}.`;
    expect(await verifySession(forged, SECRET)).toBeNull();
  });

  it("rejects a token for a different subject", async () => {
    const { SignJWT } = await import("jose");
    const token = await new SignJWT({ sub: "someone", ver: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySession(token, SECRET)).toBeNull();
  });
});

describe("sessionCookieOptions", () => {
  it("is HttpOnly, Lax, site-wide, seven days, with no Domain", () => {
    const o = sessionCookieOptions(true);
    expect(SESSION_COOKIE).toBe("admin_session");
    expect(o).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    expect(SESSION_MAX_AGE_SECONDS).toBe(7 * 24 * 3600);
    expect(o).not.toHaveProperty("domain");
  });

  it("drops Secure outside production so http://localhost works", () => {
    expect(sessionCookieOptions(false).secure).toBe(false);
  });
});
