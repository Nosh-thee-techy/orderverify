/**
 * apps/web/src/app/api/reports/pdf/route.ts
 * Download the stored verification report as a PDF. Same data as the screen
 * and the email; verdicts are not recalculated here.
 */
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { BatchReport } from "@orderverify/engine";
import { pdfFilename } from "@/lib/reportDocument";
import { sellerOrLimit } from "@/server/api";
import { getDb } from "@/server/db/client";
import { batches, orders, reports } from "@/server/db/schema";
import { buildReportPdf } from "@/server/reportPdf";

/**
 * GET ?batchId=&lang=en|sw — returns application/pdf for the seller's batch.
 */
export async function GET(request: Request) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const url = new URL(request.url);
  const batchId = url.searchParams.get("batchId") ?? "";
  const lang = url.searchParams.get("lang") === "sw" ? "sw" : "en";
  if (!z.string().uuid().safeParse(batchId).success && !z.string().min(8).max(80).safeParse(batchId).success) {
    return NextResponse.json({ error: "invalid_batch" }, { status: 400 });
  }

  const db = getDb();
  const [batch] = await db
    .select()
    .from(batches)
    .where(and(eq(batches.id, batchId), eq(batches.sellerId, gate.seller.id)))
    .limit(1);
  if (!batch) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const [reportRow] = await db.select().from(reports).where(eq(reports.batchId, batchId)).limit(1);
  const report = (reportRow?.report ?? null) as BatchReport | null;
  if (!report) return NextResponse.json({ error: "report_not_ready" }, { status: 409 });
  const orderRows = await db.select().from(orders).where(eq(orders.batchId, batchId));

  const bytes = await buildReportPdf(
    report,
    orderRows.map((order) => ({ id: order.id, customerName: order.customerName, claimedCode: order.claimedCode })),
    lang,
  );
  const filename = pdfFilename(batchId);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
