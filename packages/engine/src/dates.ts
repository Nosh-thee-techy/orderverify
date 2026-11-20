/**
 * packages/engine/src/dates.ts
 * Kenya-local date helpers. M-Pesa SMS dates are day/month/year, and the
 * seller's week starts on Monday 00:00 Africa/Nairobi (UTC+3, no daylight saving).
 */

/** Nairobi is a fixed UTC+3. Named so the cap and the parsers share one offset. */
export const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Monday 00:00 Africa/Nairobi that contains `now`, returned as a UTC Date.
 * @param now - Instant to place on the calendar
 * @returns The start of that Nairobi week
 */
export function weekStartNairobi(now: Date): Date {
  const local = new Date(now.getTime() + NAIROBI_OFFSET_MS);
  const day = local.getUTCDay();
  // Sunday (0) is 6 days after Monday; Monday (1) is 0.
  const daysSinceMonday = (day + 6) % 7;
  const mondayWallClock = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - daysSinceMonday,
    0,
    0,
    0,
    0,
  );
  return new Date(mondayWallClock - NAIROBI_OFFSET_MS);
}

/**
 * Read a Kenyan numeric date. 12/11/26 means 12 November 2026, not December.
 * @param raw - A string such as "12/11/26" or "12/11/2026"
 * @returns UTC midnight of that calendar day, or null if it is not a real date
 */
export function parseKenyaDate(raw: string): Date | null {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  if (!isRealCalendarDate(year, month, day)) return null;
  // Store as UTC midnight of the Nairobi calendar day. Callers compare Y/M/D, not instants.
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Combine a Kenyan date and a clock time into an absolute instant.
 * @param date - Calendar day
 * @param timeRaw - "14:02", "2:15 PM", or "2:02:11 PM"
 * @returns The instant in Nairobi, or null if the time cannot be read
 */
export function parseKenyaDateTime(date: Date, timeRaw: string | null): Date | null {
  if (!timeRaw) return null;
  const match = timeRaw.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;
  const ampm = match[4]?.toUpperCase();
  if (minutes > 59 || seconds > 59) return null;
  if (ampm) {
    if (hours < 1 || hours > 12) return null;
    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  // The wall clock is Nairobi, so subtract the offset to get UTC.
  return new Date(Date.UTC(y, m, d, hours, minutes, seconds) - NAIROBI_OFFSET_MS);
}

/**
 * @param year - Full year
 * @param month - 1-12
 * @param day - 1-31
 * @returns True only when that calendar day exists (rejects 31 Apr and 29 Feb on non-leap years)
 */
export function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

/**
 * Short date for plain-language sentences, e.g. "12 Nov".
 * @param year - Full year
 * @param month - 1-12
 * @param day - Day of month
 * @returns A short English date
 */
export function shortDate(year: number, month: number, day: number): string {
  const name = MONTHS_EN[month - 1] ?? String(month);
  return `${day} ${name}`;
}

/**
 * @param left - First instant
 * @param right - Second instant
 * @returns Absolute difference in minutes
 */
export function minutesApart(left: Date, right: Date): number {
  return Math.abs(left.getTime() - right.getTime()) / 60000;
}
