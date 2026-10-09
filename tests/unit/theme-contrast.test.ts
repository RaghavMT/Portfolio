import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCENTS } from "@/lib/validation/site-settings";

const css = readFileSync("src/app/globals.css", "utf8");

/** Reads `--name: #hex;` from the rule whose selector is exactly `selector` (line start, then " {"). */
function tokens(selector: string) {
  const needle = String.fromCharCode(10) + selector + " {";
  const open = css.indexOf(needle);
  expect(open, "rule " + selector + " exists").toBeGreaterThanOrEqual(0);
  const body = css.slice(open + needle.length, css.indexOf("}", open));
  const out: Record<string, string> = {};
  for (const line of body.split(";")) {
    const [name, value] = line.split(":").map((x) => x.trim());
    if (name?.startsWith("--") && value?.startsWith("#")) {
      out[name.slice(2)] = value;
    }
  }
  return out;
}

function luminance(hex: string) {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;

describe.each([
  ["light", ":root", (a: string) => `[data-accent="${a}"]`],
  ["dark", ".dark", (a: string) => `.dark [data-accent="${a}"]`],
] as const)("%s theme", (_name, base, accentSelector) => {
  const t = tokens(base);

  it("body text and muted text pass AA on the page and card backgrounds", () => {
    expect(contrast(t.fg, t.bg)).toBeGreaterThanOrEqual(AA);
    expect(contrast(t.muted, t.bg)).toBeGreaterThanOrEqual(AA);
    expect(contrast(t.muted, t.card)).toBeGreaterThanOrEqual(AA);
  });

  it.each(ACCENTS)("accent %s passes AA as text and as a button", (accent) => {
    const a = tokens(accentSelector(accent));
    expect(a.accent, "--accent defined").toBeDefined();
    expect(a["accent-fg"], "--accent-fg defined").toBeDefined();
    expect(contrast(a.accent, t.bg)).toBeGreaterThanOrEqual(AA);
    expect(contrast(a.accent, t.card)).toBeGreaterThanOrEqual(AA);
    expect(contrast(a["accent-fg"], a.accent)).toBeGreaterThanOrEqual(AA);
  });
});
