---
name: admin-mutation
description: Use when writing or changing any admin Server Action (src/server/actions/admin/**) or admin Route Handler (e.g. /api/upload) in this portfolio repo.
---

# Admin mutation checklist

Every admin write is a security boundary and a cache event (SPEC §12.3, §14.2, FR-ADM-11).

## Shape

```ts
'use server'
export async function updateThing(input: unknown): Promise<ActionResult<Thing>> {
  await requireAdmin();                          // 1. FIRST statement, no exceptions
  const parsed = thingSchema.safeParse(input);   // 2. shared Zod schema from src/lib/validation/
  if (!parsed.success) return fail(parsed.error);
  const row = await db.transaction(/* ... */);   // 3. write (transaction if multi-row)
  await invalidateContent();                     // 4. only AFTER the write succeeded
  return ok(row);                                // 5. typed result, never throw to client
}
```

## Checklist

- [ ] `await requireAdmin()` is the first statement. Route handlers also verify `Origin` matches the site origin (§12.7).
- [ ] Input is `unknown` and parsed with the entity's Zod schema; unknown keys are stripped. Client validation doesn't count.
- [ ] SQL only through the Drizzle builder or parameterised `sql`; never string concatenation.
- [ ] Multi-row writes (reorder, delete project + images) run in one transaction, or are ordered so a partial failure leaves valid data.
- [ ] `invalidateContent()` from `src/server/cache.ts` is called on success (Cache Components: wraps `updateTag('content')`). Never call `revalidatePath` / `updateTag` directly.
- [ ] Returns `{ ok: true, data } | { ok: false, error, fieldErrors? }`. No stack traces or raw DB errors reach the client.
- [ ] Blob URLs are re-checked to be on the store host (`*.public.blob.vercel-storage.com`). On replace/remove/delete, the old blob is `del()`-ed after the DB save succeeds; a failed delete is logged, not surfaced (§10.4).
- [ ] `updated_at` is set; `published_at` is set the first time a project is published.
- [ ] One-line structured log: action name, ok/fail, duration, error code. No PII, secrets or request bodies.
- [ ] The action is covered by the unauthenticated-call sweep test (§12.3, §16.2). That test enumerates every export in `src/server/actions/admin/**`, so a new file is picked up automatically; confirm it with a run.
- [ ] Admin reads live in `src/server/admin/**` (imports `server-only`), never in public query modules.
