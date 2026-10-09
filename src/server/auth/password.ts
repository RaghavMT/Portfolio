import "server-only";
import bcrypt from "bcryptjs";

/** Checks a password against `ADMIN_PASSWORD_HASH` (base64 of a bcrypt hash). Fails closed. */
export async function verifyPassword(
  password: string,
  base64Hash: string | undefined,
): Promise<boolean> {
  if (!password || !base64Hash) return false;
  try {
    const hash = Buffer.from(base64Hash, "base64").toString("utf8");
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
