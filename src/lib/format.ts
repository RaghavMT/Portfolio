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
