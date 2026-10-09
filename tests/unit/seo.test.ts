import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/json-ld";
import { resolveSiteUrl } from "@/lib/site-url";

describe("resolveSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL and strips trailing slashes", () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://example.com//",
        VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app",
      }),
    ).toBe("https://example.com");
  });

  it("falls back to the Vercel production domain", () => {
    expect(
      resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" }),
    ).toBe("https://x.vercel.app");
  });

  it("falls back to localhost", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });

  it("ignores a non-https public URL other than localhost", () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: "javascript:alert(1)",
        VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app",
      }),
    ).toBe("https://x.vercel.app");
  });
});

describe("serializeJsonLd", () => {
  it("round-trips the data", () => {
    const data = { "@type": "Person", name: "A & B" };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it("never emits a raw < so </script> cannot close the tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });

  it("escapes U+2028/2029 line separators", () => {
    const ls = String.fromCharCode(0x2028);
    const ps = String.fromCharCode(0x2029);
    const out = serializeJsonLd({ name: "a" + ls + "b" + ps + "c" });
    expect(out).not.toContain(ls);
    expect(out).not.toContain(ps);
  });
});

describe("ACCENT_HEX", () => {
  it("matches the light accent values in globals.css", async () => {
    const { readFileSync } = await import("node:fs");
    const { ACCENT_HEX } = await import("@/lib/accent-colors");
    const css = readFileSync("src/app/globals.css", "utf8");
    for (const [name, hex] of Object.entries(ACCENT_HEX)) {
      const start = css.indexOf('[data-accent="' + name + '"] {');
      expect(start, name).toBeGreaterThanOrEqual(0);
      const body = css.slice(start, css.indexOf("}", start));
      expect(body, name).toContain("--accent: " + hex);
    }
  });
});
