/**
 * apps/web/src/server/historyStore.ts
 * Persist encrypted order and M-Pesa rows for the owning seller.
 * Decrypt only for that seller, never log plaintext.
 */
import { eq } from "drizzle-orm";
import type { StatementRow } from "@orderverify/engine";
import type { BatchReport } from "@orderverify/engine";
import { encrypt, hashCode, hashName, hashPhone } from "./crypto.js";
import { getDb } from "./db/client.js";
import { mpesaRecords, orders } from "./db/schema.js";
import type { NetworkReason } from "./network.js";

export type IncomingOrder = {
  customerName: string;
  items: { name: string; qty: number; unitPriceKes?: number | null }[];
  expectedAmountKes: number | null;
  orderedAt: Date;
  claimedCode: string | null;
  chatExcerpt: string;
  phone?: string;
  source?: "whatsapp" | "tiktok" | "upload";
};

/**
 * Encrypt one order's PII. Does not write.
 * claimedCodeHash stays null until publishMatchableHashes() after a paid report —
 * unpaid drafts must not pollute other shops' cross-shop lookups.
 * @param order - Parsed order
 */
export function encryptOrderFields(order: IncomingOrder): {
  buyerNameEnc: string;
  buyerNameHash: string | null;
  buyerPhoneEnc: string | null;
  buyerPhoneHash: string | null;
  claimedCodeEnc: string | null;
  claimedCodeHash: null;
  itemSummary: string;
} {
  const itemSummary = order.items.map((item) => item.name).join(", ");
  return {
    buyerNameEnc: encrypt(order.customerName),
    buyerNameHash: hashName(order.customerName),
    buyerPhoneEnc: order.phone ? encrypt(order.phone) : null,
    buyerPhoneHash: hashPhone(order.phone),
    claimedCodeEnc: order.claimedCode ? encrypt(order.claimedCode) : null,
    // Intentionally null until the batch has settled and the report is stored.
    claimedCodeHash: null,
    itemSummary,
  };
}

/**
 * After a paid verification, publish this batch's codes into the matchable index.
 * Sets claimed_code_hash on orders and writes mpesa_records from the statement.
 *
 * @param sellerId - Owner
 * @param batchId - Settled batch
 * @param orderCodes - Decrypted claimed codes for each order id
 * @param statement - Parsed statement rows (may be empty)
 */
export async function publishMatchableHashes(
  sellerId: string,
  batchId: string,
  orderCodes: { orderId: string; claimedCode: string | null }[],
  statement: StatementRow[],
): Promise<void> {
  const db = getDb();
  for (const row of orderCodes) {
    const claimedCodeHash = hashCode(row.claimedCode);
    if (!claimedCodeHash) continue;
    await db.update(orders).set({ claimedCodeHash }).where(eq(orders.id, row.orderId));
  }
  await persistMpesaRecords(sellerId, batchId, statement);
}

/**
 * Write encrypted M-Pesa statement lines. Duplicate codes for this seller are ignored.
 * @param sellerId - Owner
 * @param batchId - Batch these rows came from
 * @param statement - Parsed statement
 */
export async function persistMpesaRecords(sellerId: string, batchId: string, statement: StatementRow[]): Promise<void> {
  if (statement.length === 0) return;
  const db = getDb();
  const values = statement
    .map((row) => {
      const code = row.receiptNo?.trim();
      if (!code) return null;
      const hash = hashCode(code);
      if (!hash) return null;
      const payer = row.details ?? "";
      return {
        batchId,
        sellerId,
        transCodeEnc: encrypt(code),
        transCodeHash: hash,
        amountKes: row.paidInKes === null ? null : Math.round(row.paidInKes),
        payerNameEnc: payer ? encrypt(payer) : null,
        payerNameHash: hashName(payer),
        payerPhoneEnc: null as string | null,
        payerPhoneHash: null as string | null,
        receivedAt: row.completedAt,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  if (values.length === 0) return;
  await db.insert(mpesaRecords).values(values).onConflictDoNothing({
    target: [mpesaRecords.transCodeHash, mpesaRecords.sellerId],
  });
}

/**
 * Store engine and (possibly raised) network verdicts on each order.
 *
 * @param engineReport - Unmodified engine output
 * @param raisedReport - After applyCrossSellerChecks
 * @param reasonsByOrder - Network reasons
 */
export async function persistOrderVerdictsFromEngine(
  engineReport: BatchReport,
  raisedReport: BatchReport,
  reasonsByOrder: Map<string, NetworkReason[]>,
): Promise<void> {
  const db = getDb();
  const engineById = new Map(engineReport.orders.map((order) => [order.orderId, order]));
  for (const order of raisedReport.orders) {
    const engine = engineById.get(order.orderId);
    await db
      .update(orders)
      .set({
        verdict: order.verdict,
        engineVerdict: engine?.verdict ?? order.verdict,
        tier: engine?.tier ?? order.tier,
        reasons: reasonsByOrder.get(order.orderId) ?? [],
      })
      .where(eq(orders.id, order.orderId));
  }
}
