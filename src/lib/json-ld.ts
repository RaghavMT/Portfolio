const BACKSLASH = String.fromCharCode(92);
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/**
 * Serialises structured data for a <script type="application/ld+json"> tag. `<` is escaped as
 * backslash-u003c so a "</script>" inside a value cannot end the tag (the one data-bearing
 * dangerouslySetInnerHTML exception in SPEC §12.4; escaping per the Next.js JSON-LD guide).
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replaceAll("<", BACKSLASH + "u003c")
    .replaceAll(LINE_SEPARATOR, BACKSLASH + "u2028")
    .replaceAll(PARAGRAPH_SEPARATOR, BACKSLASH + "u2029");
}
