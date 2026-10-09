import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Authorization sweep (SPEC §12.3 / §16.2 #3): every exported admin Server Action must reject a
// call that carries no session cookie. New files in the folder are picked up automatically.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set() {}, delete() {} }),
  headers: async () => new Headers(),
}));

const DIR = path.resolve(__dirname, "../../../src/server/actions/admin");
const files = readdirSync(DIR).filter((f) => f.endsWith(".ts"));

beforeAll(() => {
  process.env.DATABASE_URL = "postgres://user:pass@localhost/none";
  process.env.SESSION_SECRET = "s".repeat(64);
});

describe("admin Server Actions reject unauthenticated calls", () => {
  it("finds at least one admin action file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s", async (file) => {
    const source = readFileSync(path.join(DIR, file), "utf8");
    expect(source.trimStart().startsWith('"use server"')).toBe(true);

    const mod = (await import(
      /* @vite-ignore */ path.join(DIR, file)
    )) as Record<string, unknown>;
    const actions = Object.entries(mod).filter(
      ([, v]) => typeof v === "function",
    );
    expect(actions.length).toBeGreaterThan(0);
    for (const [name, fn] of actions) {
      await expect(
        (fn as (...a: unknown[]) => Promise<unknown>)(),
        `${file}:${name}`,
      ).rejects.toMatchObject({ name: "UnauthorizedError" });
    }
  });
});
