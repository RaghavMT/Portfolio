import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error(
    "DATABASE_URL is not set. Run `vercel env pull .env.local` (SPEC §20.1).",
  );

/** The app's only DB handle: Neon over HTTP (pooled URL). */
export const db = drizzle({ client: neon(url), schema });
