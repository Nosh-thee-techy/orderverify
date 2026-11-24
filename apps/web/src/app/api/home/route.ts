/**
 * apps/web/src/app/api/home/route.ts
 * Numbers for the Today screen: what is on hold, what was released, recent batches.
 */
import { and, eq, gte, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { remainingCapKes, weekStartNairobi, type BatchReport } from "@orderverify/engine";
import { sellerOrLimit } from "@/server/api";
import { getDb } from "@/server/db/client";
import { batches, orders, payments, reports } from "@/server/db/schema";
import { isBypassEnabled } from "@/server/agent/x402Client";

/** Summarise the seller's current queue. */
export async function GET() {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const db = getDb();
  const sellerId = gate.seller.id;
  const recent = await db.select().from(batches).where(eq(batches.sellerId, sellerId));
  const batchIds = recent.map((row) => row.id);
  const reportRows = batchIds.length ? await db.select().from(reports).where(inArray(reports.batchId, batchIds)) : [];
  const mine = reportRows;
  let holdKes = 0;
  let holdCount = 0;
  let toCheck = 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  let releasedToday = 0;
  const orderRows = await db.select().from(orders).where(eq(orders.sellerId, sellerId));
  for (const order of orderRows) {
    if (order.sellerDecision === "released" && order.decidedAt && order.decidedAt >= todayStart) releasedToday += 1;
    if (!order.sellerDecision) toCheck += 1;
    if (order.verdict === "HOLD" && !order.dismissedCrossFlag) {
      holdCount += 1;
      holdKes += order.claimedAmountKes ?? order.expectedAmountKes ?? 0;
    }
  }
  if (holdCount === 0) {
    for (const row of mine) {
      const report = row.report as BatchReport;
      holdCount += report.counts?.hold ?? 0;
      holdKes += report.moneyHeldKes ?? 0;
    }
  }
  const weekStart = weekStartNairobi(new Date());
  const spent = await db.select().from(payments).where(and(eq(payments.sellerId, sellerId), gte(payments.createdAt, weekStart)));
  const spentUsd = spent
    .filter((row) => row.status === "pending" || row.status === "settled" || row.status === "bypassed")
    .reduce((sum, row) => sum + Number(row.amountUsd), 0);
  const kesPerUsd = Number(process.env.KES_PER_USD ?? "129");
  return NextResponse.json({
    displayName: gate.seller.displayName,
    language: gate.seller.language,
    holdKes,
    holdCount,
    toCheck,
    releasedToday,
    batchesChecked: recent.length,
    weeklyCapLeftKes: remainingCapKes(spentUsd, gate.seller.weeklyCapKes, kesPerUsd),
    bypass: isBypassEnabled(),
    weeklyCapKes: gate.seller.weeklyCapKes,
    agentPaused: gate.seller.agentPaused,
    walletBalanceUsd: Number(gate.seller.walletBalanceUsd),
    spentUsd,
    priceUsd: Number(process.env.PRICE_USD ?? "0.01"),
    kesPerUsd,
    batches: recent
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 8)
      .map((batch) => {
        const report = mine.find((row) => row.batchId === batch.id)?.report as BatchReport | undefined;
        return {
          id: batch.id,
          status: batch.status,
          evidenceTier: batch.evidenceTier,
          createdAt: batch.createdAt.toISOString(),
          counts: report?.counts ?? { release: 0, review: 0, hold: 0 },
          moneyHeldKes: report?.moneyHeldKes ?? 0,
        };
      }),
    payments: spent
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20)
      .map((row) => ({
        id: row.id,
        batchId: row.batchId,
        amountUsd: Number(row.amountUsd),
        status: row.status,
        txHash: row.txHash,
        createdAt: row.createdAt.toISOString(),
      })),
  });
}
