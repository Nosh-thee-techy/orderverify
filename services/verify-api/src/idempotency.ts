/**
 * services/verify-api/src/idempotency.ts
 * In-memory cache so a retried batch with the same Idempotency-Key is not charged twice.
 * The verification service has no database; a restart clears the cache (see docs/DECISIONS.md).
 */
import type { NextFunction, Request, Response } from "express";

interface Cached {
  status: number;
  body: unknown;
}

const reports = new Map<string, Cached>();

/**
 * Return a cached report before the payment middleware runs.
 * @param req - Incoming request. The key is the Idempotency-Key header.
 * @param res - Response, ended when there is a hit
 * @param next - Called only when this key has not been seen
 */
export function idempotencyShortCircuit(req: Request, res: Response, next: NextFunction): void {
  const key = req.header("idempotency-key");
  if (!key) {
    res.status(400).json({ error: "missing_idempotency_key", message: "Send an Idempotency-Key header." });
    return;
  }
  const hit = reports.get(key);
  if (!hit) {
    next();
    return;
  }
  res.setHeader("X-Idempotent-Replay", "true");
  res.status(hit.status).json(hit.body);
}

/**
 * Remember a successful report under its idempotency key.
 * @param key - The Idempotency-Key from the request
 * @param status - HTTP status to replay
 * @param body - JSON body to replay
 */
export function rememberReport(key: string, status: number, body: unknown): void {
  reports.set(key, { status, body });
}

/**
 * Test helper. Production code does not call this.
 */
export function clearIdempotencyCache(): void {
  reports.clear();
}
