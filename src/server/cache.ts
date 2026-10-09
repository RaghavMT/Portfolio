import "server-only";
import { updateTag } from "next/cache";

/** Cache tag shared by every public read (SPEC §9.12, D9). */
export const CONTENT_TAG = "content";

/** The single invalidation helper: every admin mutation calls this after a successful write. */
export function invalidateContent() {
  updateTag(CONTENT_TAG);
}
