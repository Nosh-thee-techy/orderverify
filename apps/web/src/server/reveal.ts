/**
 * apps/web/src/server/reveal.ts
 * Decrypt PII for the owning seller only. Never log the result.
 */
import { decryptOrEmpty } from "./crypto.js";
import type { orders } from "./db/schema.js";

type OrderRow = typeof orders.$inferSelect;

/**
 * Plain fields the owner is allowed to see. Hashes are omitted.
 * @param row - Database order
 */
export function revealOrder(row: OrderRow): {
  id: string;
  customerName: string;
  claimedCode: string | null;
  phone: string;
  itemSummary: string;
  expectedAmountKes: number | null;
  claimedAmountKes: number | null;
  source: string;
  verdict: string | null;
  engineVerdict: string | null;
  tier: string | null;
  reasons: unknown;
  dismissedCrossFlag: boolean;
  sellerDecision: string | null;
  chatExcerpt: string;
  items: unknown;
  orderedAt: Date;
  batchId: string;
  sellerId: string;
  createdAt: Date;
} {
  const customerName = decryptOrEmpty(row.buyerNameEnc) || row.customerName;
  const claimedCode = decryptOrEmpty(row.claimedCodeEnc) || row.claimedCode;
  const phone = decryptOrEmpty(row.buyerPhoneEnc);
  return {
    id: row.id,
    customerName,
    claimedCode: claimedCode || null,
    phone,
    itemSummary: row.itemSummary,
    expectedAmountKes: row.expectedAmountKes,
    claimedAmountKes: row.claimedAmountKes,
    source: row.source,
    verdict: row.verdict,
    engineVerdict: row.engineVerdict,
    tier: row.tier,
    reasons: row.reasons,
    dismissedCrossFlag: row.dismissedCrossFlag,
    sellerDecision: row.sellerDecision,
    chatExcerpt: row.chatExcerpt,
    items: row.items,
    orderedAt: row.orderedAt,
    batchId: row.batchId,
    sellerId: row.sellerId,
    createdAt: row.createdAt,
  };
}
