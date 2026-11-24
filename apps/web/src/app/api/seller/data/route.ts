/**
 * apps/web/src/app/api/seller/data/route.ts
 * Deletes this seller's orders, M-Pesa records, batches, and claim contributions.
 * The Clerk account and sellers row stay so they can start again.
 */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sellerOrLimit } from "@/server/api";
import { getDb } from "@/server/db/client";
import { batches, crossFlagDismissals, mpesaRecords, seenCodes } from "@/server/db/schema";

/** Remove stored history for this seller. Does not delete the Clerk user. */
export async function DELETE() {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const db = getDb();
  const sellerId = gate.seller.id;
  await db.delete(crossFlagDismissals).where(eq(crossFlagDismissals.sellerId, sellerId));
  await db.delete(mpesaRecords).where(eq(mpesaRecords.sellerId, sellerId));
  await db.delete(seenCodes).where(eq(seenCodes.sellerId, sellerId));
  await db.delete(batches).where(eq(batches.sellerId, sellerId));
  return NextResponse.json({ deleted: true });
}
