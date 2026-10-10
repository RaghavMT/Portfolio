import { describe, expect, it } from "vitest";
import {
  DAILY_LIMIT,
  IP_HOURLY_LIMIT,
  MIN_FILL_MS,
  contactLimitReached,
  isBotSubmission,
  replyMailto,
} from "@/lib/contact-rules";

const NOW = 1_800_000_000_000;

describe("isBotSubmission (SPEC §11.2 step 1)", () => {
  const human = { website: "", renderedAt: String(NOW - 10_000), now: NOW };

  it("lets a normal submission through", () => {
    expect(isBotSubmission(human)).toBe(false);
  });

  it("flags a filled honeypot", () => {
    expect(isBotSubmission({ ...human, website: "http://spam.test" })).toBe(
      true,
    );
    expect(isBotSubmission({ ...human, website: " " })).toBe(true);
  });

  it("flags a form submitted in under 3 s, but not at 3 s", () => {
    expect(MIN_FILL_MS).toBe(3000);
    expect(isBotSubmission({ ...human, renderedAt: String(NOW - 2_900) })).toBe(
      true,
    );
    expect(isBotSubmission({ ...human, renderedAt: String(NOW - 3_000) })).toBe(
      false,
    );
  });

  it.each([
    null,
    undefined,
    "",
    "abc",
    "NaN",
    "Infinity",
    String(NOW + 60_000),
  ])("flags a missing, malformed or future stamp: %j", (renderedAt) => {
    expect(isBotSubmission({ ...human, renderedAt })).toBe(true);
  });
});

describe("contactLimitReached (SPEC §11.2 step 3)", () => {
  it("allows 3 per IP per hour and refuses the 4th", () => {
    expect(IP_HOURLY_LIMIT).toBe(3);
    expect(contactLimitReached({ ipLastHour: 2, allLastDay: 2 })).toBe(false);
    expect(contactLimitReached({ ipLastHour: 3, allLastDay: 3 })).toBe(true);
  });

  it("allows 20 per day overall and refuses the 21st", () => {
    expect(DAILY_LIMIT).toBe(20);
    expect(contactLimitReached({ ipLastHour: 0, allLastDay: 19 })).toBe(false);
    expect(contactLimitReached({ ipLastHour: 0, allLastDay: 20 })).toBe(true);
  });
});

describe("replyMailto (SPEC §9.8)", () => {
  it("prefixes Re: and encodes the subject", () => {
    expect(replyMailto("a@b.test", "Hello & welcome?")).toBe(
      "mailto:a@b.test?subject=Re%3A%20Hello%20%26%20welcome%3F",
    );
  });

  it("does not double the Re: prefix", () => {
    expect(replyMailto("a@b.test", "Re: Hi")).toBe(
      "mailto:a@b.test?subject=Re%3A%20Hi",
    );
  });

  it("falls back to a plain Re: when there is no subject", () => {
    expect(replyMailto("a@b.test", null)).toBe(
      "mailto:a@b.test?subject=Re%3A%20Your%20message",
    );
  });
});
