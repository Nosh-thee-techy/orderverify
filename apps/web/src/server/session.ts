/**
 * apps/web/src/server/session.ts
 * Demo session: an httpOnly cookie that points at one seller row. No passwords.
 */
import "server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "./db/client.js";
import { sellers } from "./db/schema.js";

const COOKIE = "ov_session";

export type Seller = typeof sellers.$inferSelect;

/**
 * Load the seller for this browser, creating Akinyi the first time.
 * @returns The seller row. Sets the session cookie when it creates one.
 */
export async function getOrCreateSeller(): Promise<Seller> {
  const db = getDb();
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && isUuid(existing)) {
    const found = await db.select().from(sellers).where(eq(sellers.id, existing)).limit(1);
    if (found[0]) return found[0];
  }
  const created = await db
    .insert(sellers)
    .values({
      displayName: "Akinyi",
      language: "en",
      weeklyCapKes: Number(process.env.DEFAULT_WEEKLY_CAP_KES ?? 50),
      walletBalanceUsd: "2.0000000",
    })
    .returning();
  const seller = created[0];
  if (!seller) throw new Error("Could not create the demo seller");
  jar.set(COOKIE, seller.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return seller;
}

/**
 * Hash a phone so we can recognise a repeat without storing the number.
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
