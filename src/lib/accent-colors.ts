import type { Accent } from "@/lib/validation/site-settings";

/**
 * Light-theme accent per preset, for places CSS variables can't reach (the generated OG image).
 * tests/unit/seo.test.ts keeps this in sync with globals.css.
 */
export const ACCENT_HEX: Record<Accent, string> = {
  indigo: "#4f46e5",
  blue: "#1d4ed8",
  teal: "#0f766e",
  emerald: "#047857",
  amber: "#b45309",
  rose: "#be123c",
  violet: "#6d28d9",
  slate: "#334155",
};
