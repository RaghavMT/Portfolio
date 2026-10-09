import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Locally the Neon URLs come from `vercel env pull .env.local`; on Vercel they are real env vars.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  // drizzle-kit needs a direct (unpooled) connection. Only `migrate`/`studio` use it; `generate` works offline.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? "" },
  strict: true,
  verbose: true,
});
