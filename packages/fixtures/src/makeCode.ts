/**
 * packages/fixtures/src/makeCode.ts
 * Builds a 10-character code whose first three letters encode the given calendar day.
 */
import { encodeCodePrefix } from "@orderverify/engine";

/**
 * Mint a realistic transaction code.
 * @param year - Full year
 * @param month - 1-12
 * @param day - Day of month
 * @param seq - Sequence mixed into the last seven characters so codes in one batch stay unique
 * @returns A 10-character code, or throws if the date cannot be encoded
 */
export function makeCode(year: number, month: number, day: number, seq: number): string {
  const prefix = encodeCodePrefix(year, month, day);
  if (!prefix) throw new Error(`Cannot encode ${year}-${month}-${day}`);
  const tail = Math.abs(seq).toString(36).toUpperCase().padStart(7, "0").slice(-7);
  return `${prefix}${tail}`;
}

export interface NairobiDay {
  year: number;
  month: number;
  day: number;
  /** DD/MM/YY as an M-Pesa SMS would write it. */
  label: string;
  /** 13:00 Africa/Nairobi, used as the order time. */
  orderedAt: string;
  /** 14:15 Africa/Nairobi, used as the payment time. */
  paidAt: string;
}

/**
 * A calendar day in Nairobi, `daysAgo` before `now`.
 * @param now - The clock the demo or eval is using
 * @param daysAgo - How many Nairobi midnights to step back
 * @returns Labels and instants that stay in the past relative to a midday `now`
 */
export function nairobiDay(now: Date, daysAgo: number): NairobiDay {
  const local = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const midnight = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysAgo));
  const year = midnight.getUTCFullYear();
  const month = midnight.getUTCMonth() + 1;
  const day = midnight.getUTCDate();
  const yy = String(year).slice(2);
  const label = `${day}/${month}/${yy}`;
  const orderedAt = new Date(Date.UTC(year, month - 1, day, 13, 0) - 3 * 60 * 60 * 1000).toISOString();
  const paidAt = new Date(Date.UTC(year, month - 1, day, 14, 15) - 3 * 60 * 60 * 1000).toISOString();
  return { year, month, day, label, orderedAt, paidAt };
}

/**
 * @param amount - Whole shillings
 * @returns The amount the way an SMS writes it, with a thousands separator
 */
export function formatSmsAmount(amount: number): string {
  return amount.toLocaleString("en-KE");
}
