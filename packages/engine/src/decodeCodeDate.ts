/**
 * packages/engine/src/decodeCodeDate.ts
 * Safaricom transaction codes embed the date in the first three characters.
 * This is a strong offline signal only when both the code and the SMS date can be read.
 *
 * Publicly reported pattern (Kenyan developer write-ups of M-Pesa codes):
 *   char 1 = year letter, char 2 = month letter (A = January ... L = December),
 *   char 3 = day (1-9, then A = 10 ... V = 31).
 * Codes in 2024 start with S and in 2025 with T, so the year letter index
 * (A = 1) is `year - YEAR_LETTER_BASE`. 2026 therefore starts with U.
 */

import { isRealCalendarDate } from "./dates.js";

/**
 * Year letter A corresponds to 2006 (index 1). Keep this in one place so it can
 * be corrected if a real statement disagrees with the public write-ups.
 */
export const YEAR_LETTER_BASE = 2005;

export interface CodeDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Decode the date embedded in an M-Pesa code, e.g. "UKC1234567" => 2026-11-12.
 * @param code - Transaction code, any case. Only the first three characters are read.
 * @returns The calendar date, or null if the pattern is invalid or the day does not exist.
 */
export function decodeCodeDate(code: string): CodeDate | null {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(normalized)) return null;
  const year = decodeYear(normalized[0] ?? "");
  const month = decodeMonth(normalized[1] ?? "");
  const day = decodeDay(normalized[2] ?? "");
  if (year === null || month === null || day === null) return null;
  // A well-shaped code can still name a day that never happened (31 Apr, 29 Feb 2026).
  if (!isRealCalendarDate(year, month, day)) return null;
  return { year, month, day };
}

/**
 * Build the three-character date prefix for a calendar day, so fixtures can mint realistic codes.
 * @param year - Full year
 * @param month - 1-12
 * @param day - Day of month
 * @returns Three characters, or null if the date cannot be encoded
 */
export function encodeCodePrefix(year: number, month: number, day: number): string | null {
  if (!isRealCalendarDate(year, month, day)) return null;
  const yearIndex = year - YEAR_LETTER_BASE;
  if (yearIndex < 1 || yearIndex > 26) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const yearLetter = String.fromCharCode(64 + yearIndex);
  const monthLetter = String.fromCharCode(64 + month);
  const dayChar = day <= 9 ? String(day) : String.fromCharCode(64 + (day - 9));
  // Day 10 is A (64+1), day 31 is V. `day - 9` maps 10 -> 1 (A) and 31 -> 22 (V).
  return `${yearLetter}${monthLetter}${dayChar}`;
}

function decodeYear(char: string): number | null {
  if (!/^[A-Z]$/.test(char)) return null;
  const index = char.charCodeAt(0) - 64;
  return YEAR_LETTER_BASE + index;
}

function decodeMonth(char: string): number | null {
  if (!/^[A-L]$/.test(char)) return null;
  return char.charCodeAt(0) - 64;
}

function decodeDay(char: string): number | null {
  if (/^[1-9]$/.test(char)) return Number(char);
  if (!/^[A-V]$/.test(char)) return null;
  return 9 + (char.charCodeAt(0) - 64);
}
