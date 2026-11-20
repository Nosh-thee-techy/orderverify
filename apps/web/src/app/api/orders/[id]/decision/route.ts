/**
 * apps/web/src/app/api/orders/[id]/decision/route.ts
 * Records the seller's choice. It does not change the engine verdict.
 */
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sellerOrLimit, readJson } from "@/server/api";
import { getDb } from "@/server/db/client";
import { batches, orders, seenCodes } from "@/server/db/schema";

const bodySchema = z.object({ decision: z.enum(["released", "held", "more_info"]) });

/** Save released, held, or more_info on one order that belongs to this seller. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const body = await readJson(request, 5_000);
  if ("response" in body) return body.response;
  const parsed = bodySchema.safeParse(body.json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const { id } = await context.params;
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const [batch] = await db
    .select()
    .from(batches)
    .where(and(eq(batches.id, order.batchId), eq(batches.sellerId, gate.seller.id)))
    .limit(1);
  if (!batch) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await db
    .update(orders)
    .set({ sellerDecision: parsed.data.decision, decidedAt: new Date() })
    .where(eq(orders.id, id));
  // A code counts as reused only after the seller accepts it. A second sample run
  // must still be able to show the statement catching a made-up receipt.
  if (parsed.data.decision === "released" && order.claimedCode) {
    await db
      .insert(seenCodes)
      .values({ sellerId: gate.seller.id, code: order.claimedCode, firstOrderId: order.id })
      .onConflictDoNothing();
  }
  return NextResponse.json({ id, decision: parsed.data.decision });
}
