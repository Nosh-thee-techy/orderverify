/**
 * services/verify-api/src/app.ts
 * Express app factory. Tests build it with payment turned off.
 * The listening server turns payment on unless local bypass is explicitly set.
 */
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { isBypassEnabled } from "./bypass.js";
import { verifyBatchHandler } from "./handler.js";
import { idempotencyShortCircuit } from "./idempotency.js";

export interface AppOptions {
  /** When false, the route runs the engine without charging. Used by unit tests and local bypass. */
  requirePayment?: boolean;
}

/**
 * Build the verification service.
 * @param options - Set requirePayment false to exercise the engine without Stellar
 * @returns The Express app. The caller listens, or a test calls it in-process.
 */
export async function createApp(options: AppOptions = {}): Promise<Express> {
  const requirePayment = options.requirePayment ?? !isBypassEnabled();
  if (process.env.NODE_ENV === "production" && process.env.X402_MODE === "bypass") {
    throw new Error("X402_MODE=bypass cannot be used when NODE_ENV=production.");
  }

  const app = express();
  app.use(express.json({ limit: "512kb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      priceUsd: process.env.PRICE_USD ?? "0.01",
      payment: requirePayment ? "live" : "bypass",
    });
  });

  // Must run before payment so a replay is free and an oversized batch is not charged.
  app.use("/v1/verify-batch", idempotencyShortCircuit);
  app.use("/v1/verify-batch", rejectOversizedBatch);

  if (requirePayment) {
    const { mountPayment } = await import("./payment.js");
    mountPayment(app);
  } else {
    app.use("/v1/verify-batch", (_req, res, next) => {
      res.setHeader("X-Payment-Bypass", "true");
      next();
    });
  }

  app.post("/v1/verify-batch", verifyBatchHandler);
  return app;
}

function rejectOversizedBatch(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== "POST") {
    next();
    return;
  }
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
  next();
}
