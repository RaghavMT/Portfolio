import "server-only";
import { eq, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { z } from "zod";
import { type ActionResult, failMessage, ok } from "@/lib/action-result";
import { applyOrder } from "./crud";
import { runMutation } from "./run";
import { db } from "../db/client";

/** A table with the shared list columns (SPEC §7.1: `id`, `sort_order`, `visible`). */
export type ListTable = PgTable & {
  id: PgColumn;
  sortOrder: PgColumn;
  visible: PgColumn;
};

const idSchema = z.uuid();

/**
 * Write-side CRUD for the "list of rows" entities (social links, certifications, education,
 * experience). Action files call these AFTER `await requireAdmin()` and Zod validation; the
 * helpers add the write, `invalidateContent()`, logging and safe error mapping (admin-mutation skill).
 * Row values are typed `object` here because each action already parsed them with its own schema.
 */
export function listResource<Row>(
  table: ListTable,
  noun: string,
  constraints: Parameters<typeof runMutation>[2] = {},
) {
  const notFound = () => failMessage(`${noun} not found.`);
  // Drizzle can't type a generic table; every call site is covered by its own entity schema.
  const t = table as never as ListTable & Record<string, PgColumn>;

  return {
    create(action: string, values: object): Promise<ActionResult<Row>> {
      return runMutation(
        action,
        async () => {
          const [{ next }] = await db
            .select({
              next: sql<number>`coalesce(max(${t.sortOrder}), -1) + 1`,
            })
            .from(table);
          const [row] = await db
            .insert(table)
            .values({ ...values, sortOrder: next } as never)
            .returning();
          return ok(row as Row);
        },
        constraints,
      );
    },

    update(
      action: string,
      id: unknown,
      values: object,
    ): Promise<ActionResult<Row>> {
      const parsedId = idSchema.safeParse(id);
      if (!parsedId.success) return Promise.resolve(notFound());
      return runMutation(
        action,
        async () => {
          const [row] = await db
            .update(table)
            .set(values as never)
            .where(eq(t.id, parsedId.data))
            .returning();
          return row ? ok(row as Row) : notFound();
        },
        constraints,
      );
    },

    setVisible(
      action: string,
      id: unknown,
      visible: unknown,
    ): Promise<ActionResult<void>> {
      const parsedId = idSchema.safeParse(id);
      const parsedVisible = z.boolean().safeParse(visible);
      if (!parsedId.success || !parsedVisible.success) {
        return Promise.resolve(notFound());
      }
      return runMutation(action, async () => {
        const rows = await db
          .update(table)
          .set({ visible: parsedVisible.data } as never)
          .where(eq(t.id, parsedId.data))
          .returning({ id: t.id });
        return rows.length ? ok(undefined) : notFound();
      });
    },

    remove(action: string, id: unknown): Promise<ActionResult<void>> {
      const parsedId = idSchema.safeParse(id);
      if (!parsedId.success) return Promise.resolve(notFound());
      return runMutation(action, async () => {
        const rows = await db
          .delete(table)
          .where(eq(t.id, parsedId.data))
          .returning({ id: t.id });
        return rows.length ? ok(undefined) : notFound();
      });
    },

    reorder(action: string, ids: unknown): Promise<ActionResult<void>> {
      const parsed = z.array(idSchema).safeParse(ids);
      if (!parsed.success) {
        return Promise.resolve(failMessage("Couldn't save the new order."));
      }
      return runMutation(action, async () => {
        const existing = await db.select({ id: t.id }).from(table);
        const saved = await applyOrder(
          table,
          existing.map((r) => String(r.id)),
          parsed.data,
        );
        return saved
          ? ok(undefined)
          : failMessage("The list changed — reload the page and try again.");
      });
    },
  };
}
