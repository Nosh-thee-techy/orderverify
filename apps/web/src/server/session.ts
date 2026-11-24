/**
 * apps/web/src/server/session.ts
 * Phone hashing for the existing last-3 helper. New history hashes use HASH_PEPPER in crypto.ts.
 */
import "server-only";
import { createHash } from "node:crypto";

/**
 * Hash a phone so we can recognise a repeat without storing the number.
 * Uses PHONE_HASH_SALT, not HASH_PEPPER.
 * @param phone - Raw phone text. Digits only are hashed.
 * @returns Hex hash and the last three digits, or nulls when there are too few digits
 */
export function phonePrivacy(phone: string | null | undefined): { hash: string | null; last3: string | null } {
  if (!phone) return { hash: null, last3: null };
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 3) return { hash: null, last3: null };
  const salt = process.env.PHONE_HASH_SALT ?? "dev-only-change-me";
  const hash = createHash("sha256").update(`${salt}:${digits}`).digest("hex");
  return { hash, last3: digits.slice(-3) };
}
