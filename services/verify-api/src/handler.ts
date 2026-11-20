/**
 * services/verify-api/src/handler.ts
 * Validates a batch and runs the pure rules engine. No payment decision lives here.
 */
import type { Request, Response } from "express";
import { parseVerifyBatchInput, verifyBatch } from "@orderverify/engine";
import { rememberReport } from "./idempotency.js";

/**
 * Handle POST /v1/verify-batch after payment has settled (or after bypass in local dev).
 * @param req - JSON body matching the shared zod schema
 * @param res - The report, or 400 / 413
 */
export function verifyBatchHandler(req: Request, res: Response): void {
  const max = Number(process.env.MAX_ORDERS_PER_BATCH ?? 50);
  const rawOrders = (req.body as { orders?: unknown } | null)?.orders;
  if (Array.isArray(rawOrders) && rawOrders.length > max) {
    res.status(413).json({
      error: "batch_too_large",
      message: `A batch can contain at most ${max} orders. Split it and each part is paid for separately.`,
      max,
    });
    return;
  }
  let input;
  try {
    input = parseVerifyBatchInput(req.body);
  } catch {
    res.status(400).json({ error: "invalid_body", message: "The batch did not match the expected shape." });
    return;
  }
  const report = verifyBatch(input, new Date());
  const key = req.header("idempotency-key");
  if (key) rememberReport(key, 200, report);
  res.json(report);
}
