import { slugify } from "./slug";

/**
 * Upload rules (SPEC §10.2), shared by the browser (fast feedback) and `/api/upload` (the real check).
 * SVG is never allowed: it can carry script.
 */

const MB = 1024 * 1024;

export const UPLOAD_KINDS = ["image", "resume", "og"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

type Rule = {
  types: readonly string[];
  maxBytes: number;
  /** Forced pathname prefix; whatever folder the client asks for is ignored. */
  prefix: string;
  /** Human wording for error messages. */
  typesLabel: string;
  maxLabel: string;
};

export const UPLOAD_RULES: Record<UploadKind, Rule> = {
  image: {
    types: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    maxBytes: 5 * MB,
    prefix: "images/",
    typesLabel: "a JPG, PNG, WebP or AVIF image",
    maxLabel: "5 MB",
  },
  resume: {
    types: ["application/pdf"],
    maxBytes: 5 * MB,
    prefix: "resume/",
    typesLabel: "a PDF",
    maxLabel: "5 MB",
  },
  og: {
    types: ["image/png", "image/jpeg"],
    maxBytes: 2 * MB,
    prefix: "og/",
    typesLabel: "a PNG or JPG image",
    maxLabel: "2 MB",
  },
};

export function parseUploadKind(value: unknown): UploadKind | null {
  return (UPLOAD_KINDS as readonly unknown[]).includes(value)
    ? (value as UploadKind)
    : null;
}

/** An error message for the user, or null when the file is acceptable. */
export function checkFile(
  kind: UploadKind,
  file: { type: string; size: number },
): string | null {
  const rule = UPLOAD_RULES[kind];
  if (!rule.types.includes(file.type)) {
    return `That file type isn't allowed. Choose ${rule.typesLabel}.`;
  }
  if (file.size <= 0) return "That file is empty.";
  if (file.size > rule.maxBytes) {
    return `That file is too large. The limit is ${rule.maxLabel}.`;
  }
  return null;
}

/** `images/my-photo.png`: the kind's prefix + a slugified single file name. Folders in `fileName` are dropped. */
export function uploadPathname(kind: UploadKind, fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const extension = /\.([a-z0-9]{1,5})$/i.exec(base);
  const stem = extension ? base.slice(0, -extension[0].length) : base;
  const name = slugify(stem) || "file";
  return `${UPLOAD_RULES[kind].prefix}${name}${extension ? `.${extension[1].toLowerCase()}` : ""}`;
}

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/**
 * True for an https URL on a Vercel Blob public host (SPEC §10.1 step 5). With `host`, the host must
 * match that store exactly. URLs carrying credentials are rejected.
 */
export function isBlobUrl(value: string, host?: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  if (url.port) return false;
  if (host) return url.hostname === host.toLowerCase();
  return (
    url.hostname.endsWith(BLOB_HOST_SUFFIX) &&
    url.hostname.length > BLOB_HOST_SUFFIX.length
  );
}

/** The store's public host, from its read-write token (`vercel_blob_rw_<storeId>_<secret>`); null if unset or malformed. */
export function blobHostFromToken(token: string | undefined): string | null {
  const match = /^vercel_blob_rw_([A-Za-z0-9]+)_/.exec(token ?? "");
  return match ? `${match[1].toLowerCase()}${BLOB_HOST_SUFFIX}` : null;
}

type MaybeUrl = string | null | undefined;

/** Files used `before` a save that are not used `after` it: the ones to delete (SPEC §10.4). */
export function unusedFiles(
  before: Iterable<MaybeUrl>,
  after: Iterable<MaybeUrl>,
): string[] {
  const kept = new Set(after);
  return [
    ...new Set(
      [...before].filter((url): url is string => !!url && !kept.has(url)),
    ),
  ];
}
