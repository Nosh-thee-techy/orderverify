/**
 * apps/web/src/app/api/seller/data/route.ts
 * Deletes everything stored for this seller, then forgets the session cookie.
 */
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sellerOrLimit } from "@/server/api";
import { getDb } from "@/server/db/client";
import { sellers } from "@/server/db/schema";

/** Remove the seller and every batch, order, payment, and event that belongs to them. */
export async function DELETE() {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  await getDb().delete(sellers).where(eq(sellers.id, gate.seller.id));
  const jar = await cookies();
  jar.delete("ov_session");
  return NextResponse.json({ deleted: true });
}
