import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { verifyPassword } from "@/server/auth/password";

// Throwaway test value; the real admin password lives only as a hash in env vars.
const PASSWORD = "unit-test-password";
const hash = Buffer.from(bcrypt.hashSync(PASSWORD, 4)).toString("base64");

describe("verifyPassword", () => {
  it("accepts the right password", async () => {
    expect(await verifyPassword(PASSWORD, hash)).toBe(true);
  });

  it("rejects a wrong or empty password", async () => {
    expect(await verifyPassword(PASSWORD.toUpperCase(), hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("fails closed when the hash is missing or malformed", async () => {
    expect(await verifyPassword(PASSWORD, undefined)).toBe(false);
    expect(await verifyPassword(PASSWORD, "")).toBe(false);
    expect(await verifyPassword(PASSWORD, "bm90LWEtaGFzaA==")).toBe(false);
  });
});
