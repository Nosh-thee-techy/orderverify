/**
 * packages/engine/src/verifyBatch.ts
 * Runs the rules over one batch and returns a report.
 * `now` is injected so tests stay deterministic and the engine never reads the clock itself.
 */
import {
  checkAmount,
  checkBalanceLocked,
  checkCodeDate,
  checkDuplicateCode,
  checkFormat,
  checkMatchFound,
  checkName,
  checkSender,
  checkStatementAmount,
  checkStatementFound,
  checkStatementTime,
  checkTimestamp,
  PaymentView,
} from "./checks.js";
import { matchOrdersToPayments } from "./match.js";
import { parseMpesaMessage } from "./parseMpesa.js";
import { StatementRow, VerifyBatchInput, BatchReport, OrderVerdict, EvidenceTier, CheckResult, PriorCode } from "./types.js";
import { ENGINE_VERSION } from "./version.js";
import { headlineFor, computeVerdict } from "./verdict.js";

/**
 * Verify every order in a batch.
 * @param input - Orders, payment texts, optional statement rows, and codes already accepted
 * @param now - The clock to judge "in the future" against
 * @returns A full report. The verdicts inside it are the product's decision.
 */
export function verifyBatch(input: VerifyBatchInput, now: Date): BatchReport {
  const matched = matchOrdersToPayments(input.orders, input.payments);
  const statement = input.statementRows ?? [];
  const statementByCode = indexStatement(statement);

  const drafts: { order: OrderVerdict; code: string | null }[] = input.orders.map((order) => {
    const payment = matched.byOrder.get(order.orderId) ?? null;
    const code = payment?.fields.code ?? null;
    return {
      code,
      order: {
        orderId: order.orderId,
        verdict: "RELEASE",
        tier: "TEXT_ONLY",
        headlineEn: "",
        headlineSw: "",
        matchedPaymentId: payment?.paymentId ?? null,
        checks: [],
        amountPaidKes: payment?.fields.amountKes ?? null,
        amountExpectedKes: order.expectedAmountKes,
      },
    };
  });

  const firstIndexByCode = new Map<string, number>();
  drafts.forEach((draft, index) => {
    if (!draft.code) return;
    if (!firstIndexByCode.has(draft.code)) firstIndexByCode.set(draft.code, index);
  });
  const duplicated = new Set<string>();
  for (const draft of drafts) {
    if (!draft.code) continue;
    const first = firstIndexByCode.get(draft.code);
    const seen = drafts.filter((item) => item.code === draft.code).length;
    if (seen > 1 && first !== undefined) duplicated.add(draft.code);
  }

  const orders: OrderVerdict[] = input.orders.map((order, index) => {
    const payment = matched.byOrder.get(order.orderId) ?? null;
    const code = payment?.fields.code ?? null;
    const prior = code ? findPrior(code, input.priorCodes) : null;
    const firstIndex = code ? firstIndexByCode.get(code) : undefined;
    const earlierOrderId =
      code && firstIndex !== undefined && firstIndex !== index ? drafts[firstIndex]?.order.orderId ?? null : null;
    const checks = payment
      ? checksForPayment(order, payment, earlierOrderId, prior, Boolean(code && duplicated.has(code) && firstIndex === index), now)
      : [checkMatchFound(false)];

    let tier: EvidenceTier = "TEXT_ONLY";
    if (payment && code && statementCovers(statement, payment.paidAt)) {
      tier = "STATEMENT_VERIFIED";
      const row = statementByCode.get(code) ?? null;
      checks.push(checkStatementFound(code, row));
      checks.push(checkStatementAmount(payment.fields.amountKes, row?.paidInKes ?? null));
      checks.push(checkStatementTime(payment.paidAt, row?.completedAt ?? null));
    }

    const verdict = computeVerdict(checks);
    const headline = headlineFor(checks, verdict);
    return {
      orderId: order.orderId,
      verdict,
      tier,
      headlineEn: headline.en,
      headlineSw: headline.sw,
      matchedPaymentId: payment?.paymentId ?? null,
      checks,
      amountPaidKes: payment?.fields.amountKes ?? null,
      amountExpectedKes: order.expectedAmountKes,
    };
  });

  const counts = { release: 0, review: 0, hold: 0 };
  let moneyHeldKes = 0;
  for (const order of orders) {
    if (order.verdict === "RELEASE") counts.release += 1;
    else if (order.verdict === "REVIEW") counts.review += 1;
    else {
      counts.hold += 1;
      moneyHeldKes += order.amountExpectedKes ?? order.amountPaidKes ?? 0;
    }
  }

  const anyStatement = orders.some((order) => order.tier === "STATEMENT_VERIFIED");
  return {
    reportId: makeReportId(input.batchId, now),
    batchId: input.batchId,
    engineVersion: ENGINE_VERSION,
    createdAt: now.toISOString(),
    tier: anyStatement ? "STATEMENT_VERIFIED" : "TEXT_ONLY",
    counts,
    moneyHeldKes,
    orders,
    unmatchedPayments: matched.unmatched.map((payment) => ({
      paymentId: payment.paymentId,
      code: payment.fields.code,
      amountKes: payment.fields.amountKes,
    })),
  };
}

function checksForPayment(
  order: VerifyBatchInput["orders"][number],
  payment: PaymentView,
  earlierOrderId: string | null,
  prior: PriorCode | null,
  isFirstOfDuplicate: boolean,
  now: Date,
): CheckResult[] {
  const parsed = parseMpesaMessage(payment.rawText);
  const orderedAt = new Date(order.orderedAt);
  return [
    checkFormat(parsed.ok, payment.fields),
    checkCodeDate(payment.fields),
    checkSender(payment.senderLabel),
    checkBalanceLocked(payment.fields),
    checkDuplicateCode(payment.fields.code, order.orderId, earlierOrderId, prior, isFirstOfDuplicate),
    checkAmount(payment.fields.amountKes, order.expectedAmountKes),
    checkName(order.customerName, payment.fields.senderName),
    checkTimestamp(payment.paidAt, orderedAt, now),
    checkMatchFound(true),
  ];
}

function findPrior(code: string, priorCodes: PriorCode[]): PriorCode | null {
  return priorCodes.find((item) => item.code.toUpperCase() === code.toUpperCase()) ?? null;
}

function indexStatement(rows: VerifyBatchInput["statementRows"] extends infer T ? Exclude<T, null> : never): Map<string, StatementRow> {
  const map = new Map<string, StatementRow>();
  if (!rows) return map;
  for (const row of rows) {
    const completed = row.completedAt ? new Date(row.completedAt) : null;
    map.set(row.receiptNo.toUpperCase(), {
      receiptNo: row.receiptNo.toUpperCase(),
      completedAt: completed && !Number.isNaN(completed.getTime()) ? completed : null,
      details: row.details,
      status: row.status,
      paidInKes: row.paidInKes,
      withdrawnKes: row.withdrawnKes,
    });
  }
  return map;
}

function statementCovers(rows: NonNullable<VerifyBatchInput["statementRows"]>, paidAt: Date | null): boolean {
  if (!rows.length || !paidAt) return false;
  const times = rows
    .map((row) => new Date(row.completedAt).getTime())
    .filter((time) => Number.isFinite(time));
  if (!times.length) return false;
  const day = 24 * 60 * 60 * 1000;
  const min = Math.min(...times) - day;
  const max = Math.max(...times) + day;
  return paidAt.getTime() >= min && paidAt.getTime() <= max;
}

function makeReportId(batchId: string, now: Date): string {
  // Stable enough to tell reports apart, without pulling in a UUID dependency.
  return `rpt_${batchId.slice(0, 8)}_${now.getTime()}`;
}
