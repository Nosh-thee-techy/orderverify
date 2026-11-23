/**
 * apps/web/src/server/reportHistory.ts
 * Process-local cache of emailed reports, keyed by seller + email.
 * There is no table for this yet; the map is lost when the server restarts.
 */
import "server-only";

export interface ReportHistoryEntry {
  email: string;
  batchId: string;
  sentAt: string;
  emailed: boolean;
  counts: { hold: number; review: number; release: number };
  moneyHeldKes: number;
  tier: string;
}

const cache = new Map<string, ReportHistoryEntry[]>();
const MAX_PER_PERSON = 20;

function keyFor(sellerId: string, email: string): string {
  return `${sellerId}:${email.trim().toLowerCase()}`;
}

/**
 * Store one send attempt for this seller and email address.
 *
 * @param sellerId - Demo seller id from the session
 * @param entry - Summary of the batch that was (or was not) emailed
 * @returns The updated list for that person, newest first
 */
export function rememberReport(sellerId: string, entry: ReportHistoryEntry): ReportHistoryEntry[] {
  const key = keyFor(sellerId, entry.email);
  const next = [entry, ...(cache.get(key) ?? [])].slice(0, MAX_PER_PERSON);
  cache.set(key, next);
  return next;
}

/**
 * Read cached report history for one email on this seller.
 *
 * @param sellerId - Demo seller id from the session
 * @param email - Address the seller typed
 * @returns Newest-first entries, or an empty list
 */
export function historyFor(sellerId: string, email: string): ReportHistoryEntry[] {
  return cache.get(keyFor(sellerId, email)) ?? [];
}

/**
 * Most recently used email for this seller, if they have sent a report this
 * process lifetime. Never invents an address.
 *
 * @param sellerId - Demo seller id from the session
 * @returns The last typed email, or null
 */
export function lastEmailFor(sellerId: string): string | null {
  const prefix = `${sellerId}:`;
  let latest: ReportHistoryEntry | null = null;
  for (const [key, entries] of cache) {
    if (!key.startsWith(prefix)) continue;
    for (const entry of entries) {
      if (!latest || entry.sentAt > latest.sentAt) latest = entry;
    }
  }
  return latest?.email ?? null;
}
