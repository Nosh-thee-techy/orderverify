/**
 * apps/web/src/app/api/reports/email/route.ts
 * Email a finished batch report via Resend, and remember the send in memory.
 */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import type { BatchReport } from "@orderverify/engine";
import { readJson, sellerOrLimit } from "@/server/api";
import { getDb } from "@/server/db/client";
import { orders, reports } from "@/server/db/schema";
import { loadOwnedBatch } from "@/server/ownership";
import { revealOrder } from "@/server/reveal";
import { historyFor, lastEmailFor, rememberReport } from "@/server/reportHistory";
import { renderReportEmail } from "@/server/reportEmail";

const bodySchema = z.object({
  batchId: z.string().min(1).max(80),
  email: z.string().email().max(200),
});

/**
 * POST { batchId, email }. Sends the stored report if Resend is configured.
 * Always writes the attempt into the in-memory history for this seller + email.
 */
export async function POST(request: Request) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const body = await readJson(request, 4_000);
  if ("response" in body) return body.response;
  const parsed = bodySchema.safeParse(body.json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { batchId, email } = parsed.data;
  const db = getDb();
  const batch = await loadOwnedBatch(gate.seller.id, batchId);
  if (!batch) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const [reportRow] = await db.select().from(reports).where(eq(reports.batchId, batchId)).limit(1);
  const report = (reportRow?.report ?? null) as BatchReport | null;
  if (!report) return NextResponse.json({ error: "report_not_ready" }, { status: 409 });
  const orderRows = await db.select().from(orders).where(eq(orders.batchId, batchId));
  const revealed = orderRows.map(revealOrder);
  const lang = gate.seller.language === "sw" ? "sw" : "en";

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  let emailed = false;
  let sendError: string | null = null;

  if (!apiKey || !from) {
    sendError = "email_unconfigured";
  } else {
    try {
      const resend = new Resend(apiKey);
      const result = await resend.emails.send({
        from,
        to: email,
        subject: `OrderVerify · ${shortRef(batchId)} · ${report.counts.hold} hold, ${report.counts.review} review, ${report.counts.release} release`,
        html: renderReportEmail(
          report,
          revealed.map((order) => ({ id: order.id, customerName: order.customerName, claimedCode: order.claimedCode })),
          lang,
        ),
      });
      if (result.error) {
        sendError = result.error.message || "send_failed";
      } else {
        emailed = true;
      }
    } catch {
      sendError = "send_failed";
    }
  }

  const history = rememberReport(gate.seller.id, {
    email: email.trim().toLowerCase(),
    batchId,
    sentAt: new Date().toISOString(),
    emailed,
    counts: report.counts,
    moneyHeldKes: report.moneyHeldKes,
    tier: report.tier,
  });

  if (!emailed) {
    return NextResponse.json({ error: sendError ?? "send_failed", history }, { status: 503 });
  }
  return NextResponse.json({ ok: true, history });
}

/**
 * GET ?email= returns history. GET ?last=1 returns the last typed email for
 * this seller in this process, or null — never an invented address.
 */
export async function GET(request: Request) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const url = new URL(request.url);
  if (url.searchParams.get("last") === "1") {
    return NextResponse.json({ lastEmail: lastEmailFor(gate.seller.id) });
  }
  const email = url.searchParams.get("email") ?? "";
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  return NextResponse.json({ history: historyFor(gate.seller.id, parsed.data) });
}

function shortRef(batchId: string): string {
  return batchId.replace(/-/g, "").slice(0, 8).toUpperCase() || "BATCH";
}
