import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// E2E runs against a production build (SPEC §16.2) wired to the TEST database, never prod data.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl && !process.env.CI) {
  throw new Error(
    "DATABASE_URL_TEST is not set. E2E must not run against the shared Neon database (SPEC §16.2).",
  );
}

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
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
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
    },
  },
});
