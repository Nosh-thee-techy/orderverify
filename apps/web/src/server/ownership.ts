/**
 * apps/web/src/server/ownership.ts
 * Every dashboard, history, and batch lookup must go through here so seller A
 * cannot read seller B's rows.
 */
import { and, eq } from "drizzle-orm";
import { batches } from "./db/schema.js";

export type BatchRow = typeof batches.$inferSelect;

/**
 * Return a batch only when it belongs to this seller.
 * @param sellerId - Signed-in seller
 * @param batchId - Requested batch
 * @returns The row, or null (callers map null to 404 / notFound())
 */
export async function loadOwnedBatch(sellerId: string, batchId: string): Promise<BatchRow | null> {
  const { getDb } = await import("./db/client.js");
  const db = getDb();
  const [batch] = await db
    .select()
    .from(batches)
    .where(and(eq(batches.id, batchId), eq(batches.sellerId, sellerId)))
    .limit(1);
  return batch ?? null;
}

/**
 * Pure ownership check used by tests and by callers that already loaded a row.
 * @param row - Batch or any record with sellerId
 * @param sellerId - Caller
 * @returns The row, or null when missing or owned by someone else
 */
export function ownedOrNull<T extends { sellerId: string }>(row: T | undefined | null, sellerId: string): T | null {
  if (!row || row.sellerId !== sellerId) return null;
  return row;
}
