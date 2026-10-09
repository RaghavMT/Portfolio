import "server-only";
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const encode = (secret: string) => new TextEncoder().encode(secret);

/** HS256 JWT `{ sub: "admin", ver, iat, exp }`, valid for seven days (SPEC §12.1). */
export async function signSession(
  ver: number,
  secret: string,
  issuedAt = Math.floor(Date.now() / 1000),
): Promise<string> {
  return new SignJWT({ ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_MAX_AGE_SECONDS)
    .sign(encode(secret));
}

/** Signature + expiry + subject check. Returns null for anything invalid; never throws. */
export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<{ ver: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encode(secret), {
      algorithms: ["HS256"],
      subject: "admin",
    });
    return Number.isInteger(payload.ver)
      ? { ver: payload.ver as number }
      : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/** SESSION_SECRET, or a thrown error so a misconfigured deploy fails closed. */
export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters.");
  }
  return secret;
}
