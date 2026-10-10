import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSameOrigin } from "@/lib/same-origin";

describe("isSameOrigin (SPEC §12.7)", () => {
  it("matches the request host", () => {
    expect(isSameOrigin("https://site.test", "site.test")).toBe(true);
    expect(isSameOrigin("http://localhost:3100", "localhost:3100")).toBe(true);
  });

  it.each([
    [null, "site.test"],
    ["", "site.test"],
    ["https://evil.test", "site.test"],
    ["https://site.test.evil.test", "site.test"],
    ["https://site.test:8443", "site.test"],
    ["null", "site.test"],
    ["not a url", "site.test"],
    ["https://site.test", null],
  ])("rejects origin %j for host %j", (origin, host) => {
    expect(isSameOrigin(origin, host)).toBe(false);
  });
});

// The route: the session check runs FIRST, then the Origin check, then the SDK.
const { requireAdmin, handleUpload, UnauthorizedError } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  handleUpload: vi.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {},
}));
vi.mock("@/server/auth/require-admin", () => ({
  requireAdmin: () => requireAdmin(),
  UnauthorizedError,
}));
vi.mock("@vercel/blob/client", () => ({
  handleUpload: (...args: unknown[]) => handleUpload(...args),
}));

import { POST } from "@/app/api/upload/route";

const request = (headers: Record<string, string> = {}, body = "{}") =>
  new Request("https://site.test/api/upload", {
    method: "POST",
    headers: {
      host: "site.test",
      "content-type": "application/json",
      ...headers,
    },
    body,
  });

beforeEach(() => {
  requireAdmin.mockReset();
  handleUpload.mockReset();
});

describe("POST /api/upload", () => {
  it("returns 401 without a valid session, before reading anything else", async () => {
    requireAdmin.mockRejectedValue(new UnauthorizedError());
    const res = await POST(request({ origin: "https://site.test" }));
    expect(res.status).toBe(401);
    expect(handleUpload).not.toHaveBeenCalled();
  });

  it("returns 401 even when the Origin is wrong (auth is checked first)", async () => {
    requireAdmin.mockRejectedValue(new UnauthorizedError());
    const res = await POST(request({ origin: "https://evil.test" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a signed-in admin on a foreign or missing Origin", async () => {
    requireAdmin.mockResolvedValue(undefined);
    expect((await POST(request({ origin: "https://evil.test" }))).status).toBe(
      403,
    );
    expect((await POST(request())).status).toBe(403);
    expect(handleUpload).not.toHaveBeenCalled();
  });

  it("returns the client token for a signed-in admin on the same origin", async () => {
    requireAdmin.mockResolvedValue(undefined);
    handleUpload.mockResolvedValue({
      type: "blob.generate-client-token",
      clientToken: "tok",
    });
    const res = await POST(
      request({ origin: "https://site.test" }, '{"type":"x"}'),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      type: "blob.generate-client-token",
      clientToken: "tok",
    });
    expect(handleUpload).toHaveBeenCalledTimes(1);
    // Only a token callback is registered: no onUploadCompleted (SPEC §10.1 note).
    const options = handleUpload.mock.calls[0][0];
    expect(typeof options.onBeforeGenerateToken).toBe("function");
    expect(options.onUploadCompleted).toBeUndefined();
  });

  it("returns a generic 400 (no details) when the SDK rejects the request", async () => {
    requireAdmin.mockResolvedValue(undefined);
    handleUpload.mockRejectedValue(new Error("secret internal detail"));
    const res = await POST(request({ origin: "https://site.test" }));
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });

  it("returns 400 for a body that isn't JSON", async () => {
    requireAdmin.mockResolvedValue(undefined);
    const res = await POST(
      request({ origin: "https://site.test" }, "not json"),
    );
    expect(res.status).toBe(400);
    expect(handleUpload).not.toHaveBeenCalled();
  });
});
