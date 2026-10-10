import { existsSync } from "node:fs";
import bcrypt from "bcryptjs";
import { E2E_PASSWORD, e2eBlobToken } from "./tests/e2e/constants";
import { defineConfig, devices } from "@playwright/test";

// E2E runs against a production build (SPEC §16.2) wired to the TEST database, never prod data.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl && !process.env.CI) {
  throw new Error(
    "DATABASE_URL_TEST is not set. E2E must not run against the shared Neon database (SPEC §16.2).",
  );
}

const e2ePasswordHash = Buffer.from(bcrypt.hashSync(E2E_PASSWORD, 4)).toString(
  "base64",
);

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // Admin specs change the shared test database (and expire the public cache) while they run, so they
  // run in their own project AFTER the read-only visitor/auth specs instead of beside them.
  projects: [
    {
      name: "chromium",
      testIgnore: /admin-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testIgnore: /admin-.*\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "admin",
      testMatch: /admin-.*\.spec\.ts/,
      testIgnore: /admin-settings\.spec\.ts/,
      dependencies: ["chromium", "mobile"],
      use: { ...devices["Desktop Chrome"] },
    },
    // Settings changes the home page itself (section order/visibility, accent, contact form), which
    // every other admin spec asserts on, so it runs alone and last.
    {
      name: "admin-settings",
      testMatch: /admin-settings\.spec\.ts/,
      dependencies: ["admin"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      DATABASE_URL: testUrl ?? "",
      DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_TEST_UNPOOLED ?? "",
      NEXT_PUBLIC_SITE_URL: baseURL,
      SESSION_SECRET: "e2e-session-secret-e2e-session-secret-0123456789",
      IP_HASH_SALT: "e2e-ip-salt",
      ADMIN_PASSWORD_HASH: e2ePasswordHash,
      // Never the real store token (SPEC §16.2): the test store's token, or a fake one.
      BLOB_READ_WRITE_TOKEN: e2eBlobToken(),
    },
  },
});
