/**
 * apps/web/src/app/api/orders/[id]/dismiss-cross/route.ts
 * "This is fine" on a cross-shop flag. Requires an explicit confirm body so a
 * tap cannot undo the warning by accident. Restores the engine verdict for the
 * badge and writes an audit row. Never names the other shop.
 */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { BatchReport, Verdict } from "@orderverify/engine";
import { readJson, sellerOrLimit } from "@/server/api";
import { getDb } from "@/server/db/client";
import { crossFlagDismissals, orders, reports } from "@/server/db/schema";
import { effectiveVerdict, type NetworkReason } from "@/server/network";
import { loadOwnedBatch } from "@/server/ownership";

function isVerdict(value: string | null): value is Verdict {
  return value === "RELEASE" || value === "REVIEW" || value === "HOLD";
}

const bodySchema = z.object({
  /** Must be true. Stops accidental dismiss of a cross-shop warning. */
  confirm: z.literal(true),
});

/** Dismiss the cross-shop warning on one of this seller's orders. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const body = await readJson(request, 4_096);
  if ("response" in body) return body.response;
  const parsed = bodySchema.safeParse(body.json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "confirm_required", message: "Send { \"confirm\": true } to dismiss this cross-shop warning." },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order || order.sellerId !== gate.seller.id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const batch = await loadOwnedBatch(gate.seller.id, order.batchId);
  if (!batch) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const reasons = (order.reasons as NetworkReason[]) ?? [];
  const engine = isVerdict(order.engineVerdict) ? order.engineVerdict : "REVIEW";
  const verdict = effectiveVerdict(engine, true, reasons);

  await db.insert(crossFlagDismissals).values({
    sellerId: gate.seller.id,
    orderId: order.id,
  });
  await db
    .update(orders)
    .set({ dismissedCrossFlag: true, verdict })
    .where(eq(orders.id, id));

  const [reportRow] = await db.select().from(reports).where(eq(reports.batchId, order.batchId)).limit(1);
  if (reportRow) {
    const report = reportRow.report as BatchReport;
    const next: BatchReport = {
      ...report,
      orders: report.orders.map((item) => (item.orderId === id ? { ...item, verdict } : item)),
    };
    const counts = { release: 0, review: 0, hold: 0 };
    let moneyHeldKes = 0;
    for (const item of next.orders) {
      if (item.verdict === "HOLD") {
        counts.hold += 1;
        moneyHeldKes += item.amountExpectedKes ?? item.amountPaidKes ?? 0;
      } else if (item.verdict === "REVIEW") counts.review += 1;
      else counts.release += 1;
    }
    await db.update(reports).set({ report: { ...next, counts, moneyHeldKes } }).where(eq(reports.batchId, order.batchId));
  }

  return NextResponse.json({ id, dismissed: true, verdict });
}
