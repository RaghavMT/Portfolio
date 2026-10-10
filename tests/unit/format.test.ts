import { describe, expect, it } from "vitest";
import {
  formatMonth,
  formatDateRange,
  formatDuration,
  formatExpected,
  formatRelativeTime,
  formatAdminTimestamp,
} from "@/lib/format";

describe("formatMonth", () => {
  it("shows Mon YYYY", () => {
    expect(formatMonth("2026-01-01")).toBe("Jan 2026");
    expect(formatMonth("2024-12-01")).toBe("Dec 2024");
  });
});

describe("formatExpected", () => {
  it("prefixes Expected", () => {
    expect(formatExpected("2027-06-01")).toBe("Expected Jun 2027");
  });
});

describe("formatDateRange", () => {
  it("uses Present when there is no end", () => {
    expect(formatDateRange("2026-05-01", null)).toBe("May 2026 – Present");
  });
  it("shows both ends", () => {
    expect(formatDateRange("2025-01-01", "2025-06-01")).toBe(
      "Jan 2025 – Jun 2025",
    );
  });
});

describe("formatDuration", () => {
  const now = new Date("2026-10-09T00:00:00Z");
  it("counts months inclusively", () => {
    expect(formatDuration("2025-01-01", "2025-06-01", now)).toBe("6 mos");
  });
  it("singular month", () => {
    expect(formatDuration("2025-01-01", "2025-01-01", now)).toBe("1 mo");
  });
  it("years and months", () => {
    expect(formatDuration("2024-01-01", "2025-03-01", now)).toBe("1 yr 3 mos");
  });
  it("whole years", () => {
    expect(formatDuration("2023-01-01", "2024-12-01", now)).toBe("2 yrs");
  });
  it("uses the current month when ongoing", () => {
    expect(formatDuration("2026-05-01", null, now)).toBe("6 mos");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it("says just now under a minute", () => {
    expect(formatRelativeTime(ago(20_000), now)).toBe("just now");
  });
  it("counts minutes, hours and days", () => {
    expect(formatRelativeTime(ago(5 * MIN), now)).toBe("5 min ago");
    expect(formatRelativeTime(ago(HOUR), now)).toBe("1 hr ago");
    expect(formatRelativeTime(ago(3 * HOUR), now)).toBe("3 hrs ago");
    expect(formatRelativeTime(ago(DAY), now)).toBe("1 day ago");
    expect(formatRelativeTime(ago(6 * DAY), now)).toBe("6 days ago");
  });
  it("falls back to a date after a week", () => {
    expect(formatRelativeTime(ago(10 * DAY), now)).toBe("30 Sep 2026");
  });
  it("treats a future time as just now", () => {
    expect(formatRelativeTime(new Date(now.getTime() + MIN), now)).toBe(
      "just now",
    );
  });
});

describe("formatAdminTimestamp", () => {
  it("shows Asia/Kolkata time", () => {
    expect(formatAdminTimestamp(new Date("2026-10-10T12:00:00Z"))).toBe(
      "10 Oct 2026, 5:30 pm",
    );
  });
});
