/**
 * apps/web/src/server/seller.ts
 * Resolve the signed-in Clerk user to a sellers row. First visit inserts the row.
 * No Clerk webhook: upsert is lazy.
 */
import "server-only";
import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { clerkDisplayName } from "@/lib/sellerName";
import { getDb } from "./db/client.js";
import { sellers } from "./db/schema.js";

export type Seller = typeof sellers.$inferSelect;

/**
 * Insert or refresh the sellers row for this Clerk user.
 * A later request that has no Clerk name must not overwrite a name we already stored.
 *
 * @param userId - Clerk user id (primary key)
 * @returns The sellers row
 */
export async function upsertSellerForUserId(userId: string): Promise<Seller> {
  const db = getDb();
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const clerkName = clerkDisplayName(user);
  const existing = await db.select().from(sellers).where(eq(sellers.id, userId)).limit(1);
  if (existing[0]) {
    const patch: { displayName?: string; email?: string } = {};
    // Only write a name when Clerk actually sent one. Empty currentUser() used to
    // replace the greeting with a blank or "Seller" after leaving Today.
    if (clerkName && clerkName !== existing[0].displayName) patch.displayName = clerkName;
    if (email && email !== existing[0].email) patch.email = email;
    if (Object.keys(patch).length === 0) return existing[0];
    const [updated] = await db.update(sellers).set(patch).where(eq(sellers.id, userId)).returning();
    return updated ?? existing[0];
  }
  const created = await db
    .insert(sellers)
    .values({
      id: userId,
      displayName: clerkName || "Seller",
      email,
      language: "en",
      weeklyCapKes: Number(process.env.DEFAULT_WEEKLY_CAP_KES ?? 50),
      walletBalanceUsd: "2.0000000",
    })
    .onConflictDoNothing()
    .returning();
  if (created[0]) return created[0];
  const [again] = await db.select().from(sellers).where(eq(sellers.id, userId)).limit(1);
  if (!again) throw new Error("Could not create the seller row");
  return again;
}

/**
 * Current seller for a page. Redirects to sign-in when there is no session.
 * @returns The sellers row for the signed-in Clerk user
 */
export async function getCurrentSeller(): Promise<Seller> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return upsertSellerForUserId(userId);
}

/**
 * Current seller for an API route. Returns null when unauthenticated (no redirect).
 * @returns The sellers row, or null
 */
export async function requireSeller(): Promise<Seller | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return upsertSellerForUserId(userId);
}
