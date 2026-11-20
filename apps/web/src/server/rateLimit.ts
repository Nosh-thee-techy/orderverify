/**
 * apps/web/src/server/rateLimit.ts
 * A small in-memory limit so a pasted chat cannot hammer the API.
 * This is per server process, which is enough for the demo.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Allow up to `limit` hits per minute for a key.
 * @param key - Usually the seller id or the client IP
 * @param limit - Maximum hits in the window
 * @returns False when the caller should receive HTTP 429
 */
export function allow(key: string, limit = 60): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}
