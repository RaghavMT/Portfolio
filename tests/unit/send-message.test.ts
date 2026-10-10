import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  countRecentMessages: vi.fn(),
  insertMessage: vi.fn(),
  sendContactNotification: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ "x-forwarded-for": "198.51.100.7", "user-agent": "UA/1" }),
}));
vi.mock("@/server/queries/public", () => ({
  getSettings: () => mocks.getSettings(),
}));
vi.mock("@/server/contact", () => ({
  countRecentMessages: (...a: unknown[]) => mocks.countRecentMessages(...a),
  insertMessage: (...a: unknown[]) => mocks.insertMessage(...a),
}));
vi.mock("@/server/email", () => ({
  sendContactNotification: (...a: unknown[]) =>
    mocks.sendContactNotification(...a),
}));

import { sendMessage, type ContactState } from "@/server/actions/contact";

const idle: ContactState = { status: "idle" };
const NOW = 1_800_000_000_000;

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const fields: Record<string, string> = {
    name: "Ada",
    email: "ada@example.test",
    company: "",
    subject: "Hello",
    body: "I would like to talk about a role.",
    website: "",
    renderedAt: String(NOW - 10_000),
    ...overrides,
  };
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("IP_HASH_SALT", "salt");
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.getSettings.mockResolvedValue({
    contactFormEnabled: true,
    contactEmail: "me@example.test",
  });
  mocks.countRecentMessages.mockResolvedValue({ ipLastHour: 0, allLastDay: 0 });
  mocks.insertMessage.mockResolvedValue({ id: "m1" });
  mocks.sendContactNotification.mockResolvedValue(undefined);
});

describe("sendMessage (SPEC §11.2)", () => {
  it("stores a valid message with a hashed IP and a short user agent", async () => {
    const state = await sendMessage(idle, form());
    expect(state.status).toBe("success");
    expect(state.message).toBe("Thanks — I'll reply within 2 working days.");
    expect(mocks.insertMessage).toHaveBeenCalledTimes(1);
    const row = mocks.insertMessage.mock.calls[0][0];
    expect(row).toMatchObject({
      name: "Ada",
      email: "ada@example.test",
      subject: "Hello",
      company: null,
      userAgent: "UA/1",
    });
    expect(row.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain("198.51.100.7");
    expect(mocks.sendContactNotification).toHaveBeenCalledTimes(1);
    expect(mocks.sendContactNotification.mock.calls[0][1]).toBe(
      "me@example.test",
    );
  });

  it("pretends success and writes nothing when the honeypot is filled", async () => {
    const state = await sendMessage(
      idle,
      form({ website: "http://spam.test" }),
    );
    expect(state.status).toBe("success");
    expect(mocks.insertMessage).not.toHaveBeenCalled();
    expect(mocks.sendContactNotification).not.toHaveBeenCalled();
    expect(mocks.countRecentMessages).not.toHaveBeenCalled();
  });

  it("pretends success and writes nothing when sent under 3 s after render", async () => {
    const state = await sendMessage(
      idle,
      form({ renderedAt: String(NOW - 1_000) }),
    );
    expect(state.status).toBe("success");
    expect(mocks.insertMessage).not.toHaveBeenCalled();
  });

  it("returns field errors and the typed values, and stores nothing", async () => {
    const state = await sendMessage(
      idle,
      form({ email: "nope", body: "short", name: "Ada" }),
    );
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email?.length).toBeGreaterThan(0);
    expect(state.fieldErrors?.body?.length).toBeGreaterThan(0);
    expect(state.values).toMatchObject({ name: "Ada", email: "nope" });
    expect(mocks.insertMessage).not.toHaveBeenCalled();
  });

  it("refuses the 4th message in an hour and points to the email address", async () => {
    mocks.countRecentMessages.mockResolvedValue({
      ipLastHour: 3,
      allLastDay: 3,
    });
    const state = await sendMessage(idle, form());
    expect(state.status).toBe("error");
    expect(state.message).toContain("Too many messages");
    expect(state.message).toContain("me@example.test");
    expect(mocks.insertMessage).not.toHaveBeenCalled();
  });

  it("refuses when 20 messages came in today", async () => {
    mocks.countRecentMessages.mockResolvedValue({
      ipLastHour: 0,
      allLastDay: 20,
    });
    const state = await sendMessage(idle, form());
    expect(state.status).toBe("error");
    expect(mocks.insertMessage).not.toHaveBeenCalled();
  });

  it("refuses when the form is switched off in Settings", async () => {
    mocks.getSettings.mockResolvedValue({
      contactFormEnabled: false,
      contactEmail: "me@example.test",
    });
    const state = await sendMessage(idle, form());
    expect(state.status).toBe("error");
    expect(mocks.insertMessage).not.toHaveBeenCalled();
  });

  it("still succeeds when the email step throws", async () => {
    mocks.sendContactNotification.mockRejectedValue(new Error("resend down"));
    const state = await sendMessage(idle, form());
    expect(state.status).toBe("success");
    expect(mocks.insertMessage).toHaveBeenCalledTimes(1);
  });

  it("returns a safe error (no raw text) when the database write fails", async () => {
    mocks.insertMessage.mockRejectedValue(new Error("connection string xyz"));
    const state = await sendMessage(idle, form());
    expect(state.status).toBe("error");
    expect(JSON.stringify(state)).not.toContain("xyz");
  });
});
