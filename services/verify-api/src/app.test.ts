/**
 * services/verify-api/src/app.test.ts
 * The unpaid engine path: validation, the batch-size limit, and idempotent replay.
 * The Stellar payment itself is covered by scripts/x402-smoke.mjs when keys are present.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { encodeCodePrefix } from "@orderverify/engine";
import { createApp } from "./app.js";
import { clearIdempotencyCache } from "./idempotency.js";

let server: Server;
let base: string;

beforeAll(async () => {
  const app = await createApp({ requirePayment: false });
  server = app.listen(0);
  const address = server.address() as AddressInfo;
  base = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  clearIdempotencyCache();
});

afterAll(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
});

function payload() {
  const code = `${encodeCodePrefix(2026, 11, 12)}AAAAAAA`;
  return {
    batchId: "b1",
    orders: [
      {
        orderId: "o1",
        customerName: "Mary Wanjiku",
        items: [{ name: "Dress", qty: 1 }],
        expectedAmountKes: 2500,
        orderedAt: "2026-11-12T11:00:00.000Z",
        claimedCode: code,
      },
    ],
    payments: [
      {
        paymentId: "p1",
        senderLabel: "M-PESA",
        rawText: `${code} Confirmed. You have received Ksh2,500.00 from MARY WANJIKU 0712345678 on 12/11/26 at 2:15 PM. New M-PESA balance is Ksh5,000.00.`,
      },
    ],
    statementRows: null,
    priorCodes: [],
  };
}

describe("verify-api", () => {
  it("answers /health without charging", async () => {
    const res = await fetch(`${base}/health`);
    const body = (await res.json()) as { ok: boolean; payment: string };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.payment).toBe("bypass");
  });

  it("returns a report and replays it for the same key without a second computation header missing", async () => {
    const first = await fetch(`${base}/v1/verify-batch`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "same-key" },
      body: JSON.stringify(payload()),
    });
    expect(first.status).toBe(200);
    expect(first.headers.get("x-payment-bypass")).toBe("true");
    const report = (await first.json()) as { orders: { verdict: string }[] };
    expect(report.orders[0]?.verdict).toBe("RELEASE");

    const second = await fetch(`${base}/v1/verify-batch`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "same-key" },
      body: JSON.stringify(payload()),
    });
    expect(second.status).toBe(200);
    expect(second.headers.get("x-idempotent-replay")).toBe("true");
  });

  it("rejects a missing key and an oversized batch", async () => {
    const missing = await fetch(`${base}/v1/verify-batch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload()),
    });
    expect(missing.status).toBe(400);

    const big = payload();
    big.orders = Array.from({ length: 51 }, (_, index) => ({ ...big.orders[0]!, orderId: `o${index}` }));
    const res = await fetch(`${base}/v1/verify-batch`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "big" },
      body: JSON.stringify(big),
    });
    expect(res.status).toBe(413);
  });
});
