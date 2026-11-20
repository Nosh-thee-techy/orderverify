/**
 * packages/engine/src/match.ts
 * Assign each payment to at most one order.
 * A code the buyer pasted wins. Otherwise we score amount, name, and time.
 */
import { paymentInstant } from "./checks.js";
import { scoreNames } from "./names.js";
import { parseMpesaMessage } from "./parseMpesa.js";
import { MpesaParseResult, OrderInput, PaymentInput } from "./types.js";
import { PaymentView } from "./checks.js";

export interface MatchResult {
  /** orderId -> payment. Orders with no entry were not matched. */
  byOrder: Map<string, PaymentView>;
  unmatched: PaymentView[];
  parsed: PaymentView[];
}

/**
 * Match orders to payments.
 * @param orders - Structured orders
 * @param payments - Raw M-Pesa messages
 * @returns The assignment. Each payment is used at most once.
 */
export function matchOrdersToPayments(orders: OrderInput[], payments: PaymentInput[]): MatchResult {
  const parsed = payments.map(toView);
  const used = new Set<string>();
  const byOrder = new Map<string, PaymentView>();

  for (const order of orders) {
    const claimed = order.claimedCode?.trim().toUpperCase() || null;
    if (!claimed) continue;
    const hit = parsed.find((payment) => !used.has(payment.paymentId) && payment.fields.code === claimed);
    if (!hit) continue;
    used.add(hit.paymentId);
    byOrder.set(order.orderId, hit);
  }

  const openOrders = orders.filter((order) => !byOrder.has(order.orderId));
  const pairs: { orderId: string; paymentId: string; score: number; index: number }[] = [];
  let index = 0;
  for (const order of openOrders) {
    for (const payment of parsed) {
      if (used.has(payment.paymentId)) continue;
      const score = scorePair(order, payment);
      if (score <= 0) continue;
      pairs.push({ orderId: order.orderId, paymentId: payment.paymentId, score, index: index++ });
    }
  }
  pairs.sort((a, b) => b.score - a.score || a.index - b.index);
  for (const pair of pairs) {
    if (byOrder.has(pair.orderId) || used.has(pair.paymentId)) continue;
    const payment = parsed.find((item) => item.paymentId === pair.paymentId);
    if (!payment) continue;
    used.add(pair.paymentId);
    byOrder.set(pair.orderId, payment);
  }

  return {
    byOrder,
    unmatched: parsed.filter((payment) => !used.has(payment.paymentId)),
    parsed,
  };
}

function toView(payment: PaymentInput): PaymentView {
  const parsed: MpesaParseResult = parseMpesaMessage(payment.rawText);
  return {
    paymentId: payment.paymentId,
    fields: parsed.fields,
    senderLabel: payment.senderLabel,
    rawText: payment.rawText,
    paidAt: paymentInstant(parsed.fields),
  };
}

function scorePair(order: OrderInput, payment: PaymentView): number {
  const paid = payment.fields.amountKes;
  const expected = order.expectedAmountKes;
  let score = 0;
  if (paid !== null && expected !== null) {
    if (paid === expected) score += 100;
    else if (paid < expected && paid > 0) score += 50;
    else if (paid > expected && paid <= expected * 1.5) score += 40;
    else return 0;
  } else if (paid !== null || expected !== null) {
    score += 10;
  }
  if (payment.fields.senderName) {
    const names = scoreNames(order.customerName, payment.fields.senderName);
    score += names.score * 25;
  }
  if (payment.paidAt) {
    const ordered = new Date(order.orderedAt);
    if (!Number.isNaN(ordered.getTime())) {
      const hours = Math.abs(payment.paidAt.getTime() - ordered.getTime()) / 3600000;
      if (hours <= 6) score += 15;
      else if (hours <= 48) score += 5;
    }
  }
  // Require a real amount or name signal. A stray message must not attach itself to every order.
  return score >= 40 ? score : 0;
}
