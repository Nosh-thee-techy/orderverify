/**
 * apps/web/src/app/api/batches/[id]/route.ts
 * One batch: its orders, the stored report, and any drafted replies.
 * Another seller's batch id returns 404.
 */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { BatchReport, Verdict } from "@orderverify/engine";
import { templateReply } from "@/server/agent/replies";
import { sellerOrLimit } from "@/server/api";
import { getDb } from "@/server/db/client";
import { agentEvents, orders, paymentEvidence, reports } from "@/server/db/schema";
import { effectiveVerdict, type NetworkReason } from "@/server/network";
import { loadOwnedBatch } from "@/server/ownership";
import { revealOrder } from "@/server/reveal";

function isVerdict(value: string | null): value is Verdict {
  return value === "RELEASE" || value === "REVIEW" || value === "HOLD";
}

/** Return the report and the orders, including the seller's decision. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const { id } = await context.params;
  const batch = await loadOwnedBatch(gate.seller.id, id);
  if (!batch) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const db = getDb();
  const orderRows = await db.select().from(orders).where(eq(orders.batchId, id));
  const evidence = await db.select().from(paymentEvidence).where(eq(paymentEvidence.batchId, id));
  const [reportRow] = await db.select().from(reports).where(eq(reports.batchId, id)).limit(1);
  const events = await db.select().from(agentEvents).where(eq(agentEvents.batchId, id));
  const draftEvent = [...events].reverse().find((event) => {
    const data = event.data as { drafts?: Record<string, { en: string; sw: string }> } | null;
    return Boolean(data?.drafts);
  });
  const storedDrafts = (draftEvent?.data as { drafts?: Record<string, { en: string; sw: string }> } | null)?.drafts ?? {};
  let report = (reportRow?.report ?? null) as BatchReport | null;
  const revealed = orderRows.map(revealOrder);
  if (report) {
    report = {
      ...report,
      orders: report.orders.map((item) => {
        const row = orderRows.find((order) => order.id === item.orderId);
        if (!row) return item;
        const reasons = (row.reasons as NetworkReason[]) ?? [];
        const engine = isVerdict(row.engineVerdict) ? row.engineVerdict : item.verdict;
        const verdict = effectiveVerdict(engine, row.dismissedCrossFlag, reasons);
        return {
          ...item,
          verdict,
          tier: row.tier === "STATEMENT_VERIFIED" || row.tier === "TEXT_ONLY" ? row.tier : item.tier,
        };
      }),
    };
  }
  return NextResponse.json({
    batch: {
      id: batch.id,
      status: batch.status,
      evidenceTier: batch.evidenceTier,
      errorCode: batch.errorCode,
      createdAt: batch.createdAt.toISOString(),
    },
    orders: revealed.map((order) => ({
      id: order.id,
      customerName: order.customerName,
      items: order.items,
      expectedAmountKes: order.expectedAmountKes,
      orderedAt: order.orderedAt.toISOString(),
      claimedCode: order.claimedCode,
      chatExcerpt: order.chatExcerpt,
      phoneLast3: order.phone ? order.phone.slice(-3) : null,
      sellerDecision: order.sellerDecision,
      dismissedCrossFlag: order.dismissedCrossFlag,
      reasons: order.reasons,
      verdict: order.verdict,
      engineVerdict: order.engineVerdict,
      tier: order.tier,
    })),
    payments: evidence.map((item) => ({ id: item.id, rawText: item.rawText, senderLabel: item.senderLabel })),
    report,
    drafts: Object.fromEntries(
      revealed.map((order) => [order.id, storedDrafts[order.id] ?? templateReply(order.customerName)]),
    ),
  });
}
