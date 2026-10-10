import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

import {
  CONTACT_SUBJECT,
  sendContactNotification,
  sendLockoutAlert,
} from "@/server/email";

const message = {
  name: "Ada",
  email: "ada@example.test",
  company: "Analytical Engines",
  subject: "Hi\r\nBcc: evil@example.test",
  body: "Hello there, I would like to talk.",
};

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ data: { id: "1" }, error: null });
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("CONTACT_FROM_EMAIL", "portfolio@example.test");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendContactNotification (SPEC §11.2 step 5)", () => {
  it("does nothing without the API key or sender", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await sendContactNotification(message, "me@example.test");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CONTACT_FROM_EMAIL", "");
    await sendContactNotification(message, "me@example.test");
    expect(send).not.toHaveBeenCalled();
  });

  it("sends to the owner with a fixed subject and reply-to = the visitor", async () => {
    await sendContactNotification(message, "me@example.test");
    expect(send).toHaveBeenCalledTimes(1);
    const args = send.mock.calls[0][0];
    expect(args.from).toBe("portfolio@example.test");
    expect(args.to).toBe("me@example.test");
    expect(args.replyTo).toBe("ada@example.test");
    expect(args.subject).toBe(CONTACT_SUBJECT);
    // visitor input appears only in the plain-text body, never in a header (SPEC §11.3)
    expect(args.text).toContain("Hello there");
    expect(args.text).toContain("Analytical Engines");
    expect(JSON.stringify({ ...args, text: "" })).not.toContain("evil@");
    expect(args.html).toBeUndefined();
  });

  it("never throws when the send rejects", async () => {
    send.mockRejectedValue(new Error("network"));
    await expect(
      sendContactNotification(message, "me@example.test"),
    ).resolves.toBeUndefined();
  });

  it("never throws when Resend returns an error object", async () => {
    send.mockResolvedValue({ data: null, error: { message: "bad key" } });
    await expect(
      sendContactNotification(message, "me@example.test"),
    ).resolves.toBeUndefined();
  });
});

describe("sendLockoutAlert (SPEC §12.2)", () => {
  it("is a no-op when Resend is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await sendLockoutAlert("me@example.test");
    expect(send).not.toHaveBeenCalled();
  });

  it("emails the owner and swallows failures", async () => {
    await sendLockoutAlert("me@example.test");
    expect(send.mock.calls[0][0].to).toBe("me@example.test");
    send.mockRejectedValue(new Error("down"));
    await expect(sendLockoutAlert("me@example.test")).resolves.toBeUndefined();
  });
});
