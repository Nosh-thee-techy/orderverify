/**
 * apps/web/src/app/api/batches/[id]/route.ts
 * One batch: its orders, the stored report, and any drafted replies.
 */
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { templateReply } from "@/server/agent/replies";
import { sellerOrLimit } from "@/server/api";
import { getDb } from "@/server/db/client";
import { agentEvents, batches, orders, paymentEvidence, reports } from "@/server/db/schema";
import type { BatchReport } from "@orderverify/engine";

/** Return the report and the orders, including the seller's decision. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const { id } = await context.params;
  const db = getDb();
  const [batch] = await db.select().from(batches).where(and(eq(batches.id, id), eq(batches.sellerId, gate.seller.id))).limit(1);
  if (!batch) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const orderRows = await db.select().from(orders).where(eq(orders.batchId, id));
  const evidence = await db.select().from(paymentEvidence).where(eq(paymentEvidence.batchId, id));
  const [reportRow] = await db.select().from(reports).where(eq(reports.batchId, id)).limit(1);
  const events = await db.select().from(agentEvents).where(eq(agentEvents.batchId, id));
  const draftEvent = [...events].reverse().find((event) => {
    const data = event.data as { drafts?: Record<string, { en: string; sw: string }> } | null;
    return Boolean(data?.drafts);
  });
  const storedDrafts = (draftEvent?.data as { drafts?: Record<string, { en: string; sw: string }> } | null)?.drafts ?? {};
  const report = (reportRow?.report ?? null) as BatchReport | null;
  return NextResponse.json({
    batch: {
      id: batch.id,
      status: batch.status,
      evidenceTier: batch.evidenceTier,
      errorCode: batch.errorCode,
      createdAt: batch.createdAt.toISOString(),
    },
    orders: orderRows.map((order) => ({
      id: order.id,
      customerName: order.customerName,
      items: order.items,
      expectedAmountKes: order.expectedAmountKes,
      orderedAt: order.orderedAt.toISOString(),
      claimedCode: order.claimedCode,
      chatExcerpt: order.chatExcerpt,
      phoneLast3: order.customerPhoneLast3,
      sellerDecision: order.sellerDecision,
    })),
    payments: evidence.map((item) => ({ id: item.id, rawText: item.rawText, senderLabel: item.senderLabel })),
    report,
    drafts: Object.fromEntries(
      orderRows.map((order) => [order.id, storedDrafts[order.id] ?? templateReply(order.customerName)]),
    ),
  });
}
