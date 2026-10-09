// Applies the SQL migrations in drizzle/ (SPEC §7.4).
//   pnpm build      → runs this without --force: migrates only on Vercel production builds, so preview
//                     builds (which share the production DB) and local builds never change the schema.
//   pnpm db:migrate → runs with --force: migrates whatever DATABASE_URL_UNPOOLED points at.
import { existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const forced = process.argv.includes("--force");
const vercelEnv = process.env.VERCEL_ENV;

if (!forced && vercelEnv !== "production") {
  console.info(
    `[migrate] skipped (VERCEL_ENV=${vercelEnv ?? "unset"}; pass --force to run)`,
  );
  process.exit(0);
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error(
    "[migrate] DATABASE_URL_UNPOOLED is not set. Run `vercel env pull .env.local`.",
  );
  process.exit(1);
}

const started = Date.now();
try {
  await migrate(drizzle({ client: neon(url) }), {
    migrationsFolder: "drizzle",
  });
  console.info(
    `[migrate] ok host=${new URL(url).hostname} ms=${Date.now() - started}`,
  );
} catch (error) {
  console.error(
    "[migrate] failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
