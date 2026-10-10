import { beforeEach, describe, expect, it, vi } from "vitest";

// A real-shaped token for store "abc123"; the secret part is fake.
const TOKEN = "vercel_blob_rw_abc123_FAKESECRET";
const HOST = "abc123.public.blob.vercel-storage.com";

const del = vi.fn();
vi.mock("@vercel/blob", () => ({ del: (...args: unknown[]) => del(...args) }));

import { assertOwnBlobUrls, deleteBlobs, tokenOptions } from "@/server/blob";

beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = TOKEN;
  del.mockReset();
  del.mockResolvedValue(undefined);
});

const payload = (kind: unknown) => JSON.stringify({ kind });

describe("tokenOptions (SPEC §10.1 step 3)", () => {
  it("returns the image rules with a random suffix", async () => {
    expect(await tokenOptions("images/cover.png", payload("image"))).toEqual({
      allowedContentTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
      ],
      maximumSizeInBytes: 5 * 1024 * 1024,
      addRandomSuffix: true,
    });
  });

  it("returns the resume and OG rules", async () => {
    expect(
      await tokenOptions("resume/cv.pdf", payload("resume")),
    ).toMatchObject({
      allowedContentTypes: ["application/pdf"],
      addRandomSuffix: true,
    });
    expect(await tokenOptions("og/card.png", payload("og"))).toMatchObject({
      allowedContentTypes: ["image/png", "image/jpeg"],
      maximumSizeInBytes: 2 * 1024 * 1024,
    });
  });

  it.each([null, "", "not json", "[]", "{}", payload("avatar"), payload(1)])(
    "rejects client payload %j",
    async (clientPayload) => {
      await expect(
        tokenOptions("images/a.png", clientPayload),
      ).rejects.toThrow();
    },
  );

  it.each([
    ["resume/a.pdf", "image"], // wrong prefix for the kind
    ["og/a.png", "image"],
    ["images/a.png", "resume"],
    ["a.png", "image"], // no folder
    ["images/sub/a.png", "image"], // nested folder
    ["images/../resume/a.png", "image"],
    ["/images/a.png", "image"],
    ["images/a b.png", "image"], // not slugified
    ["images/", "image"],
  ])("rejects pathname %s for kind %s", async (pathname, kind) => {
    await expect(tokenOptions(pathname, payload(kind))).rejects.toThrow();
  });
});

describe("assertOwnBlobUrls (SPEC §10.1 step 5)", () => {
  it("accepts URLs on this store and ignores null/undefined", () => {
    expect(() =>
      assertOwnBlobUrls([`https://${HOST}/images/a-x.png`, null, undefined]),
    ).not.toThrow();
  });

  it("rejects another store's Blob URL and non-Blob URLs", () => {
    expect(() =>
      assertOwnBlobUrls(["https://zzz.public.blob.vercel-storage.com/a.png"]),
    ).toThrow();
    expect(() => assertOwnBlobUrls(["https://example.com/a.png"])).toThrow();
  });

  it("rejects everything when the token is missing", () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    expect(() =>
      assertOwnBlobUrls([`https://${HOST}/images/a-x.png`]),
    ).toThrow();
  });
});

describe("deleteBlobs (SPEC §10.4)", () => {
  it("deletes only this store's files, once each", async () => {
    const mine = `https://${HOST}/images/a-x.png`;
    await deleteBlobs([
      mine,
      mine,
      null,
      "https://example.com/not-ours.png",
      "https://zzz.public.blob.vercel-storage.com/other.png",
    ]);
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith([mine]);
  });

  it("does nothing for an empty list", async () => {
    await deleteBlobs([null, undefined]);
    expect(del).not.toHaveBeenCalled();
  });

  it("logs a failure but never throws", async () => {
    del.mockRejectedValue(new Error("boom"));
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(
      deleteBlobs([`https://${HOST}/images/a-x.png`]),
    ).resolves.toBeUndefined();
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining('"action":"deleteBlobs"'),
    );
    info.mockRestore();
  });
});
