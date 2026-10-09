import "server-only";
import { eq, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { sameIdSet } from "@/lib/admin/reorder";
import { db } from "../db/client";

/** The columns every orderable table shares (SPEC §7.1: `sort_order`, `visible`). */
type Orderable = {
  id: PgColumn;
  sortOrder: PgColumn;
};

/**
 * Persists a new order as one atomic `db.batch` (neon-http has no interactive transactions, D24).
 * `existingIds` is what the table holds right now; the submission must match it exactly, so a stale
 * or tampered list can't silently drop or invent rows.
 */
export async function applyOrder(
  table: Orderable & Parameters<typeof db.update>[0],
  existingIds: readonly string[],
  submittedIds: readonly string[],
): Promise<boolean> {
  if (!sameIdSet(submittedIds, existingIds)) return false;
  if (submittedIds.length === 0) return true;
  const [first, ...rest] = submittedIds.map((id, index) =>
    db
      .update(table)
      .set({ sortOrder: index })
      .where(eq(table.id, id) as SQL),
  );
  await db.batch([first, ...rest]);
  return true;
}
