import { describe, expect, it } from "vitest";
import {
  blobHostFromToken,
  checkFile,
  isBlobUrl,
  parseUploadKind,
  unusedFiles,
  uploadPathname,
  UPLOAD_RULES,
} from "@/lib/upload-rules";

const MB = 1024 * 1024;

describe("UPLOAD_RULES (SPEC §10.2)", () => {
  it("matches the table", () => {
    expect(UPLOAD_RULES.image.maxBytes).toBe(5 * MB);
    expect(UPLOAD_RULES.image.types).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ]);
    expect(UPLOAD_RULES.resume.maxBytes).toBe(5 * MB);
    expect(UPLOAD_RULES.resume.types).toEqual(["application/pdf"]);
    expect(UPLOAD_RULES.og.maxBytes).toBe(2 * MB);
    expect(UPLOAD_RULES.og.types).toEqual(["image/png", "image/jpeg"]);
  });

  it("never allows SVG", () => {
    for (const rule of Object.values(UPLOAD_RULES)) {
      expect(rule.types.some((t) => t.includes("svg"))).toBe(false);
    }
  });
});

describe("checkFile", () => {
  it("accepts a normal image", () => {
    expect(checkFile("image", { type: "image/png", size: 1 * MB })).toBeNull();
  });

  it("accepts exactly the limit", () => {
    expect(checkFile("image", { type: "image/webp", size: 5 * MB })).toBeNull();
  });

  it("rejects a 6 MB image", () => {
    expect(checkFile("image", { type: "image/png", size: 6 * MB })).toMatch(
      /5 MB/,
    );
  });

  it("rejects SVG", () => {
    expect(checkFile("image", { type: "image/svg+xml", size: 1000 })).toMatch(
      /JPG, PNG, WebP or AVIF/,
    );
  });

  it("rejects a PDF as an image and an image as a resume", () => {
    expect(
      checkFile("image", { type: "application/pdf", size: 1000 }),
    ).not.toBeNull();
    expect(
      checkFile("resume", { type: "image/png", size: 1000 }),
    ).not.toBeNull();
  });

  it("applies the 2 MB OG limit and rejects webp for OG", () => {
    expect(checkFile("og", { type: "image/png", size: 3 * MB })).toMatch(
      /2 MB/,
    );
    expect(checkFile("og", { type: "image/webp", size: 1000 })).not.toBeNull();
  });

  it("rejects empty files", () => {
    expect(checkFile("image", { type: "image/png", size: 0 })).not.toBeNull();
  });
});

describe("parseUploadKind", () => {
  it("accepts the three kinds", () => {
    expect(parseUploadKind("image")).toBe("image");
    expect(parseUploadKind("resume")).toBe("resume");
    expect(parseUploadKind("og")).toBe("og");
  });

  it.each([undefined, null, "", "IMAGE", "avatar", 3, {}])(
    "rejects %s",
    (value) => {
      expect(parseUploadKind(value)).toBeNull();
    },
  );
});

describe("uploadPathname", () => {
  it("forces the kind's prefix and slugifies the name", () => {
    expect(uploadPathname("image", "My Photo (1).PNG")).toBe(
      "images/my-photo-1.png",
    );
    expect(uploadPathname("resume", "Raghav Tibra CV.pdf")).toBe(
      "resume/raghav-tibra-cv.pdf",
    );
    expect(uploadPathname("og", "card.jpeg")).toBe("og/card.jpeg");
  });

  it("ignores any folder the client put in the name", () => {
    expect(uploadPathname("image", "../../resume/evil.png")).toBe(
      "images/evil.png",
    );
    expect(uploadPathname("image", "C:\\temp\\a.png")).toBe("images/a.png");
  });

  it("falls back to 'file' when nothing usable is left", () => {
    expect(uploadPathname("image", "!!!.png")).toBe("images/file.png");
    expect(uploadPathname("image", "")).toBe("images/file");
  });

  it("drops odd extensions", () => {
    expect(uploadPathname("image", "a.p/ng")).toBe("images/ng");
    expect(uploadPathname("image", "a.<script>")).toBe("images/a-script");
  });
});

describe("isBlobUrl", () => {
  const host = "abc123.public.blob.vercel-storage.com";

  it("accepts a Blob URL", () => {
    expect(isBlobUrl(`https://${host}/images/a-xyz.png`)).toBe(true);
  });

  it("requires the exact store host when given", () => {
    expect(isBlobUrl(`https://${host}/a.png`, host)).toBe(true);
    expect(
      isBlobUrl("https://other.public.blob.vercel-storage.com/a.png", host),
    ).toBe(false);
  });

  it.each([
    "http://abc123.public.blob.vercel-storage.com/a.png",
    "https://public.blob.vercel-storage.com.evil.com/a.png",
    "https://evil.com/abc123.public.blob.vercel-storage.com",
    "https://evilpublic.blob.vercel-storage.com/a.png",
    "https://user@evil.com@abc123.public.blob.vercel-storage.com/a.png",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "not a url",
    "",
  ])("rejects %s", (url) => {
    expect(isBlobUrl(url)).toBe(false);
  });
});

describe("blobHostFromToken", () => {
  it("derives the lower-cased store host from a read-write token", () => {
    expect(
      blobHostFromToken("vercel_blob_rw_ExAmPlE1dAbC_NotARealSecret"),
    ).toBe("example1dabc.public.blob.vercel-storage.com");
  });

  it.each([
    undefined,
    "",
    "nope",
    "vercel_blob_ro_abc_def",
    "vercel_blob_rw__x",
  ])("returns null for %j", (token) => {
    expect(blobHostFromToken(token)).toBeNull();
  });
});

describe("unusedFiles", () => {
  it("returns files that were used before and are not used now", () => {
    expect(unusedFiles(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
  });

  it("returns nothing when nothing was dropped", () => {
    expect(unusedFiles(["a"], ["a", "b"])).toEqual([]);
    expect(unusedFiles([], ["a"])).toEqual([]);
  });

  it("ignores empty values and de-duplicates", () => {
    expect(unusedFiles(["a", null, undefined, "", "a"], [null])).toEqual(["a"]);
  });

  it("treats a replaced file as dropped and an unchanged one as kept", () => {
    expect(unusedFiles(["old.png"], ["new.png"])).toEqual(["old.png"]);
    expect(unusedFiles(["same.png"], ["same.png"])).toEqual([]);
  });
});
