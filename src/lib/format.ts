const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Month-precision dates are "YYYY-MM-DD" strings (SPEC §7.1); parse without touching time zones. */
function parts(date: string) {
  const [year, month] = date.split("-").map(Number);
  return { year, month };
}

export function formatMonth(date: string) {
  const { year, month } = parts(date);
  return `${MONTHS[month - 1]} ${year}`;
}

export function formatExpected(date: string) {
  return `Expected ${formatMonth(date)}`;
}

export function formatDateRange(start: string, end: string | null) {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : "Present"}`;
}

/** Inclusive month count, e.g. Jan–Jun = "6 mos", 1 yr 3 mos. An open end counts to `now`. */
export function formatDuration(
  start: string,
  end: string | null,
  now: Date = new Date(),
) {
  const s = parts(start);
  const e = end
    ? parts(end)
    : { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  const total = Math.max(1, (e.year - s.year) * 12 + (e.month - s.month) + 1);
  const years = Math.floor(total / 12);
  const months = total % 12;
  const out: string[] = [];
  if (years) out.push(`${years} ${years === 1 ? "yr" : "yrs"}`);
  if (months) out.push(`${months} ${months === 1 ? "mo" : "mos"}`);
  return out.join(" ");
}

const IST_PARTS = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

/** Wall-clock parts in Asia/Kolkata; month names come from MONTHS so ICU wording can't change them. */
function istParts(date: Date) {
  const get = Object.fromEntries(
    IST_PARTS.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    day: get.day,
    month: MONTHS[Number(get.month) - 1],
    year: get.year,
    time: `${get.hour}:${get.minute} ${get.dayPeriod.toLowerCase()}`,
  };
}

function formatShortDate(date: Date) {
  const { day, month, year } = istParts(date);
  return `${day} ${month} ${year}`;
}

/** "just now", "5 min ago", "3 hrs ago", "2 days ago"; a date once it is over a week old. */
export function formatRelativeTime(date: Date, now: Date = new Date()) {
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return formatShortDate(date);
}

/** Admin timestamps are shown in Asia/Kolkata (SPEC §14.2), e.g. "10 Oct 2026, 5:30 pm". */
export function formatAdminTimestamp(date: Date) {
  return `${formatShortDate(date)}, ${istParts(date).time}`;
}
