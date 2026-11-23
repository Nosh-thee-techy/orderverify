/**
 * apps/web/src/lib/reportDocument.ts
 * Shared view-model for the on-screen report, the PDF, and the email.
 * Verdicts are passed through from the engine; nothing here chooses them.
 */
import type { BatchReport, EvidenceTier, OrderVerdict, Verdict } from "@orderverify/engine";

export interface ReportOrderSource {
  id: string;
  customerName: string;
  claimedCode: string | null;
}

export interface ReportCheckLine {
  title: string;
  plain: string;
  status: string;
  evidence: Record<string, string | number | null>;
}

export interface ReportOrderLine {
  orderId: string;
  orderRef: string;
  customerName: string;
  paymentRef: string | null;
  expectedAmountKes: number | null;
  receivedAmountKes: number | null;
  verdict: Verdict;
  tier: EvidenceTier;
  headline: string;
  explanation: string;
  checks: ReportCheckLine[];
}

export interface ReportDocument {
  batchId: string;
  batchRef: string;
  createdAt: string;
  tier: EvidenceTier;
  counts: { total: number; release: number; review: number; hold: number };
  moneyHeldKes: number;
  orders: ReportOrderLine[];
  unmatchedPayments: BatchReport["unmatchedPayments"];
}

/**
 * Short, filename-safe batch reference from the stored id.
 *
 * @param batchId - UUID or other batch id
 * @returns Eight-character uppercase token, or BATCH
 */
export function shortBatchRef(batchId: string): string {
  const compact = batchId.replace(/-/g, "").toUpperCase();
  return compact.slice(0, 8) || "BATCH";
}

/**
 * Download name for a completed report PDF.
 *
 * @param batchId - Stored batch id
 * @returns OrderVerify_Report_[ref].pdf
 */
export function pdfFilename(batchId: string): string {
  return `OrderVerify_Report_${shortBatchRef(batchId)}.pdf`;
}

/**
 * Build the document both the screen and the exports render.
 *
 * @param report - Engine report already stored for this batch
 * @param orders - Seller-facing order rows used for names and claimed codes
 * @param lang - Which headline/explanation language to surface
 * @returns A report document with only fields that already exist
 */
export function buildReportDocument(
  report: BatchReport,
  orders: ReportOrderSource[],
  lang: "en" | "sw",
): ReportDocument {
  const byId = new Map(orders.map((order) => [order.id, order]));
  return {
    batchId: report.batchId,
    batchRef: shortBatchRef(report.batchId),
    createdAt: report.createdAt,
    tier: report.tier,
    counts: {
      total: report.orders.length,
      release: report.counts.release,
      review: report.counts.review,
      hold: report.counts.hold,
    },
    moneyHeldKes: report.moneyHeldKes,
    orders: report.orders.map((verdict) => toLine(verdict, byId.get(verdict.orderId), lang)),
    unmatchedPayments: report.unmatchedPayments,
  };
}

function toLine(
  verdict: OrderVerdict,
  order: ReportOrderSource | undefined,
  lang: "en" | "sw",
): ReportOrderLine {
  const checks = verdict.checks.map((check) => ({
    title: lang === "sw" ? check.titleSw : check.titleEn,
    plain: lang === "sw" ? check.plainSw : check.plainEn,
    status: check.status,
    evidence: check.evidence,
  }));
  const flagged = checks.find((check) => check.status === "fail") ?? checks.find((check) => check.status === "warn");
  const headline = lang === "sw" ? verdict.headlineSw : verdict.headlineEn;
  return {
    orderId: verdict.orderId,
    orderRef: shortBatchRef(verdict.orderId),
    customerName: order?.customerName ?? shortBatchRef(verdict.orderId),
    paymentRef: order?.claimedCode ?? null,
    expectedAmountKes: verdict.amountExpectedKes,
    receivedAmountKes: verdict.amountPaidKes,
    verdict: verdict.verdict,
    tier: verdict.tier,
    headline,
    explanation: flagged?.plain ?? headline,
    checks,
  };
}

/**
 * Group order lines by verdict for the findings sections.
 *
 * @param orders - Document lines
 * @returns Release, review, and hold groups (empty arrays when none)
 */
export function groupReportOrders(orders: ReportOrderLine[]): Record<Verdict, ReportOrderLine[]> {
  return {
    RELEASE: orders.filter((order) => order.verdict === "RELEASE"),
    REVIEW: orders.filter((order) => order.verdict === "REVIEW"),
    HOLD: orders.filter((order) => order.verdict === "HOLD"),
  };
}
