/**
 * apps/web/src/server/network.ts
 * Cross-shop checks run AFTER the engine report and BEFORE we persist this batch's
 * hashes as matchable history. The engine stays pure: this file talks to Postgres.
 * Other sellers are never named. Verdicts are only raised, never lowered.
 */
import { and, inArray, ne } from "drizzle-orm";
import type { BatchReport, Verdict } from "@orderverify/engine";
import { mpesaRecords, orders } from "./db/schema.js";

// Uploaded statements are seller-provided, so a cross-shop statement hit is REVIEW
// (check first), not HOLD. Live feed / STK tiers can raise this later.
export const CROSS_SHOP_STATEMENT = {
  id: "CROSS_SHOP_STATEMENT",
  en: "This payment code also appears in another OrderVerify shop's M-Pesa records. Check before you dispatch.",
  sw: "Kodi hii ya malipo inaonekana pia kwenye rekodi za M-Pesa za duka lingine la OrderVerify. Angalia kabla ya kutuma.",
} as const;

export const CROSS_SHOP_CLAIM = {
  id: "CROSS_SHOP_CLAIM",
  en: "This payment code was also claimed on another OrderVerify shop.",
  sw: "Kodi hii ya malipo imedaiwa pia kwenye duka lingine la OrderVerify.",
} as const;

export type NetworkReason = {
  id: typeof CROSS_SHOP_STATEMENT.id | typeof CROSS_SHOP_CLAIM.id;
  en: string;
  sw: string;
};

const RANK: Record<Verdict, number> = { RELEASE: 0, REVIEW: 1, HOLD: 2 };

/**
 * Raise a verdict. HOLD stays HOLD. RELEASE may become REVIEW or HOLD.
 * @param current - Engine (or previous) verdict
 * @param next - Proposed raise
 */
export function raiseVerdict(current: Verdict, next: Verdict): Verdict {
  return RANK[next] > RANK[current] ? next : current;
}

/**
 * Apply already-looked-up cross-shop hits to one report. No database.
 * STATEMENT_VERIFIED is never granted from another shop's data.
 *
 * @param report - Engine report
 * @param hashByOrderId - claimed_code_hash for each order
 * @param otherStatementHashes - Codes found in other sellers' mpesa_records
 * @param otherClaimHashes - Codes found in other sellers' orders
 */
export function applyNetworkHits(
  report: BatchReport,
  hashByOrderId: Map<string, string | null>,
  otherStatementHashes: Set<string>,
  otherClaimHashes: Set<string>,
): { report: BatchReport; reasonsByOrder: Map<string, NetworkReason[]> } {
  const reasonsByOrder = new Map<string, NetworkReason[]>();
  const nextOrders = report.orders.map((order) => {
    const hash = hashByOrderId.get(order.orderId);
    if (!hash) return order;
    const reasons: NetworkReason[] = [];
    let verdict = order.verdict;
    if (otherStatementHashes.has(hash)) {
      verdict = raiseVerdict(verdict, "REVIEW");
      reasons.push({ id: CROSS_SHOP_STATEMENT.id, en: CROSS_SHOP_STATEMENT.en, sw: CROSS_SHOP_STATEMENT.sw });
    } else if (otherClaimHashes.has(hash)) {
      verdict = raiseVerdict(verdict, "REVIEW");
      reasons.push({ id: CROSS_SHOP_CLAIM.id, en: CROSS_SHOP_CLAIM.en, sw: CROSS_SHOP_CLAIM.sw });
    }
    if (reasons.length === 0) return order;
    reasonsByOrder.set(order.orderId, reasons);
    const top = reasons[0];
    return {
      ...order,
      verdict,
      headlineEn: top?.en ?? order.headlineEn,
      headlineSw: top?.sw ?? order.headlineSw,
    };
  });
  const counts = { release: 0, review: 0, hold: 0 };
  let moneyHeldKes = 0;
  for (const order of nextOrders) {
    if (order.verdict === "HOLD") {
      counts.hold += 1;
      moneyHeldKes += order.amountExpectedKes ?? order.amountPaidKes ?? 0;
    } else if (order.verdict === "REVIEW") counts.review += 1;
    else counts.release += 1;
  }
  return {
    report: { ...report, orders: nextOrders, counts, moneyHeldKes },
    reasonsByOrder,
  };
}

/**
 * Look up OTHER sellers' hashes, then raise verdicts on this report.
 * Does not read or write this seller's own rows.
 *
 * @param report - Fresh engine report
 * @param sellerId - Current seller (excluded from lookups)
 * @param orderHashes - claimed_code_hash per order id
 */
export async function applyCrossSellerChecks(
  report: BatchReport,
  sellerId: string,
  orderHashes: { orderId: string; claimedCodeHash: string | null }[],
): Promise<{ report: BatchReport; reasonsByOrder: Map<string, NetworkReason[]> }> {
  const hashes = [...new Set(orderHashes.map((row) => row.claimedCodeHash).filter((value): value is string => Boolean(value)))];
  const hashByOrderId = new Map(orderHashes.map((row) => [row.orderId, row.claimedCodeHash]));
  if (hashes.length === 0) {
    return { report, reasonsByOrder: new Map() };
  }
  const { getDb } = await import("./db/client.js");
  const db = getDb();
  const statementRows = await db
    .select({ hash: mpesaRecords.transCodeHash })
    .from(mpesaRecords)
    .where(and(inArray(mpesaRecords.transCodeHash, hashes), ne(mpesaRecords.sellerId, sellerId)));
  const claimRows = await db
    .select({ hash: orders.claimedCodeHash })
    .from(orders)
    .where(and(inArray(orders.claimedCodeHash, hashes), ne(orders.sellerId, sellerId)));
  const otherStatementHashes = new Set(statementRows.map((row) => row.hash));
  const otherClaimHashes = new Set(claimRows.map((row) => row.hash).filter((value): value is string => Boolean(value)));
  return applyNetworkHits(report, hashByOrderId, otherStatementHashes, otherClaimHashes);
}

/**
 * Effective badge after a dismiss: drop network raises and restore the engine verdict.
 * @param engineVerdict - Verdict the rules engine produced
 * @param dismissed - Whether the seller accepted the cross-shop flag
 * @param networkReasons - Flags stored on the order
 */
export function effectiveVerdict(engineVerdict: Verdict, dismissed: boolean, networkReasons: NetworkReason[]): Verdict {
  if (dismissed || networkReasons.length === 0) return engineVerdict;
  return networkReasons.reduce((current, reason) => {
    if (reason.id === CROSS_SHOP_STATEMENT.id || reason.id === CROSS_SHOP_CLAIM.id) {
      return raiseVerdict(current, "REVIEW");
    }
    return current;
  }, engineVerdict);
}
