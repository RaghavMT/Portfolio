import { createHash } from "node:crypto";

/** SHA-256(ip + salt) as hex; the raw IP is never stored (SPEC §12.8). */
export function hashIp(ip: string, salt: string): string {
  return createHash("sha256")
    .update(ip + salt)
    .digest("hex");
}

/** First hop of `x-forwarded-for` (set by Vercel); a constant when absent. */
export function clientIp(headers: Headers): string {
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || "unknown";
}
