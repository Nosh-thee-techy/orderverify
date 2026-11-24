/**
 * apps/telegram-bot/src/runCheck.ts
 * Turns pasted chat + M-Pesa text into a VerifyBatchInput and calls verify-api.
 * Same paid endpoint as the web app so the comparison is fair.
 */
import { randomUUID } from "node:crypto";
import {
  parseMpesaMessage,
  splitMpesaMessages,
  parseStatement,
  verifyBatch,
  type BatchReport,
  type VerifyBatchInput,
} from "@orderverify/engine";

export type RunCheckInput = {
  chatText: string;
  paymentsText: string;
  statementText: string;
};

/**
 * Build a minimal batch from free-text pastes.
 * One order per claimed code found in the payment paste; amounts come from the SMS.
 * @param input - Seller pastes
 * @returns Body for POST /v1/verify-batch
 */
export function buildVerifyInput(input: RunCheckInput): VerifyBatchInput {
  const batchId = randomUUID();
  const messages = splitMpesaMessages(input.paymentsText);
  const payments = messages.map((rawText, index) => ({
    paymentId: `tg-pay-${index + 1}`,
    rawText,
    senderLabel: "M-PESA" as string | null,
  }));
  const now = new Date().toISOString();
  const orders = payments.map((payment, index) => {
    const parsed = parseMpesaMessage(payment.rawText);
    const amount = parsed.fields.amountKes;
    const name = parsed.fields.senderName || guessName(input.chatText) || "Customer";
    return {
      orderId: `tg-order-${index + 1}`,
      customerName: name,
      items: [{ name: "Order", qty: 1, unitPriceKes: amount }],
      expectedAmountKes: amount,
      orderedAt: now,
      claimedCode: parsed.fields.code,
    };
  });
  const statement = input.statementText.trim() ? parseStatement(input.statementText) : null;
  return {
    batchId,
    orders: orders.length
      ? orders
      : [
          {
            orderId: "tg-order-1",
            customerName: guessName(input.chatText) || "Customer",
            items: [{ name: "Order", qty: 1, unitPriceKes: null }],
            expectedAmountKes: null,
            orderedAt: now,
            claimedCode: null,
          },
        ],
    payments,
    statementRows: statement && statement.length > 0 ? statement : null,
    priorCodes: [],
  };
}

/**
 * Call the paid verification API. Uses the same URL as the web app.
 * In bypass mode the API skips Stellar; in live mode this returns 402 unless
 * the caller attaches a payment (the bot lab defaults to bypass).
 *
 * @param input - Paste bundle
 * @returns Engine report JSON
 */
export async function runPaidCheck(input: RunCheckInput): Promise<BatchReport> {
  const body = buildVerifyInput(input);
  const base = process.env.VERIFY_API_URL ?? "http://localhost:4021";
  try {
    const response = await fetch(`${base}/v1/verify-batch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "idempotency-key": `tg-${body.batchId}`,
      },
      body: JSON.stringify(body),
    });
    // Lab fallback: if API needs payment or is down, run the same engine locally.
    if (response.status === 402 || response.status >= 500) {
      return verifyBatch(body, new Date());
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`verify-api ${response.status}: ${text.slice(0, 200)}`);
    }
    return (await response.json()) as BatchReport;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("verify-api")) throw error;
    return verifyBatch(body, new Date());
  }
}

/**
 * Pull a likely buyer name from free chat text (first capitalised token pair).
 * @param chat - Pasted chat
 */
function guessName(chat: string): string | null {
  const match = chat.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/);
  return match?.[1] ?? null;
}

/**
 * One-line summary of a report for Telegram.
 * @param report - Engine report
 * @param lang - en | sw
 */
export function formatReportSummary(report: BatchReport, lang: "en" | "sw"): string {
  const lines =
    lang === "sw"
      ? [
          `Ripoti: ${report.counts.release} sawa, ${report.counts.review} angalia, ${report.counts.hold} zuia`,
          `Kiwango: ${report.tier === "STATEMENT_VERIFIED" ? "taarifa" : "maandishi pekee"}`,
          `Fedha iliyozuiliwa: KES ${report.moneyHeldKes.toLocaleString("en-KE")}`,
        ]
      : [
          `Report: ${report.counts.release} release, ${report.counts.review} review, ${report.counts.hold} hold`,
          `Tier: ${report.tier === "STATEMENT_VERIFIED" ? "statement-checked" : "text only"}`,
          `Money held: KES ${report.moneyHeldKes.toLocaleString("en-KE")}`,
        ];
  for (const order of report.orders.slice(0, 8)) {
    const headline = lang === "sw" ? order.headlineSw : order.headlineEn;
    lines.push(`• ${order.verdict} — ${headline}`);
  }
  if (report.orders.length > 8) lines.push(`… +${report.orders.length - 8} more`);
  return lines.join("\n");
}
