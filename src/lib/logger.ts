/** One structured line per server action (SPEC §13.6). Never pass secrets, passwords or bodies. */
export function logAction(entry: {
  action: string;
  ok: boolean;
  startedAt: number;
  code?: string;
}) {
  console.info(
    JSON.stringify({
      action: entry.action,
      ok: entry.ok,
      ms: Date.now() - entry.startedAt,
      ...(entry.code ? { code: entry.code } : {}),
    }),
  );
}
