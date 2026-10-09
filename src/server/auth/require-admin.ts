import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db/client";
import { siteSettings } from "../db/schema";
import { SESSION_COOKIE, sessionSecret, verifySession } from "./session";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * The real security boundary (SPEC §12.3): signature, expiry AND session version.
 * Every admin Server Action and Route Handler calls this as its first statement.
 */
export async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) throw new UnauthorizedError();
  const session = await verifySession(token, sessionSecret());
  if (!session) throw new UnauthorizedError();
  const [row] = await db
    .select({ ver: siteSettings.sessionVersion })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1));
  if (!row || row.ver !== session.ver) throw new UnauthorizedError();
}

/** For admin pages and layouts: same check, but sends a logged-out visitor to the login page. */
export async function requireAdminPage(): Promise<void> {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }
}
