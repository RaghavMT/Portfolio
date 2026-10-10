import "server-only";
import { del, head } from "@vercel/blob";
import { logAction } from "@/lib/logger";
import {
  blobHostFromToken,
  isBlobUrl,
  parseUploadKind,
  UPLOAD_RULES,
} from "@/lib/upload-rules";

/** Upload rules and Blob helpers (SPEC §10). Callers have already passed `requireAdmin()`. */

/** Pathname a client may upload to: the kind's folder + one slugified file name, nothing nested. */
const SAFE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]{1,5})?$/;

/**
 * `onBeforeGenerateToken` for `/api/upload` (SPEC §10.1 step 3). The token is bound to the pathname
 * the client asked for, so the "forced prefix" is enforced by refusing any pathname outside the
 * kind's folder; type, size limit and the random suffix come from the server-side rules.
 */
export async function tokenOptions(
  pathname: string,
  clientPayload: string | null,
) {
  let kindValue: unknown;
  try {
    kindValue = (JSON.parse(clientPayload ?? "") as { kind?: unknown } | null)
      ?.kind;
  } catch {
    throw new Error("Invalid upload request");
  }
  const kind = parseUploadKind(kindValue);
  if (!kind) throw new Error("Invalid upload request");

  const rule = UPLOAD_RULES[kind];
  const name = pathname.startsWith(rule.prefix)
    ? pathname.slice(rule.prefix.length)
    : null;
  if (name === null || !SAFE_NAME.test(name)) {
    throw new Error("Invalid upload request");
  }
  return {
    allowedContentTypes: [...rule.types],
    maximumSizeInBytes: rule.maxBytes,
    addRandomSuffix: true,
  };
}

function storeHost(): string | null {
  return blobHostFromToken(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Throws unless every URL is a file in THIS project's Blob store (SPEC §10.1 step 5). null/undefined
 * (no image) are skipped. With no token configured nothing can be trusted, so everything is refused.
 */
export function assertOwnBlobUrls(urls: Iterable<string | null | undefined>) {
  const host = storeHost();
  for (const url of urls) {
    if (!url) continue;
    if (!host || !isBlobUrl(url, host)) throw new Error("Invalid file URL");
  }
}

/**
 * Deletes files from the store after the DB save succeeded (SPEC §10.4). Skips anything that isn't
 * ours, de-duplicates, and never throws: a failed delete is logged, not shown to the user.
 */
export async function deleteBlobs(
  urls: Iterable<string | null | undefined>,
): Promise<void> {
  const host = storeHost();
  const own = [
    ...new Set(
      [...urls].filter((u): u is string => !!u && !!host && isBlobUrl(u, host)),
    ),
  ];
  if (own.length === 0) return;
  const startedAt = Date.now();
  try {
    await del(own);
    logAction({ action: "deleteBlobs", ok: true, startedAt });
  } catch {
    logAction({
      action: "deleteBlobs",
      ok: false,
      startedAt,
      code: "blob_delete_failed",
    });
  }
}

/** Size in bytes of one of our files, or null when it can't be read (shown on the Profile page, SPEC §9.4). */
export async function blobSize(url: string | null): Promise<number | null> {
  const host = storeHost();
  if (!url || !host || !isBlobUrl(url, host)) return null;
  try {
    return (await head(url)).size;
  } catch {
    return null;
  }
}
