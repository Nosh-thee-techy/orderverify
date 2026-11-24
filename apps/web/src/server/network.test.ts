/**
 * apps/web/src/server/network.test.ts
 * Cross-shop raises: statement or claim in another shop is REVIEW (uploaded
 * statements are not ground truth); a seller never flags herself; HOLD is never lowered.
 */
import { describe, expect, it } from "vitest";
import type { BatchReport, OrderVerdict } from "@orderverify/engine";
import {
  applyNetworkHits,
  CROSS_SHOP_CLAIM,
  CROSS_SHOP_STATEMENT,
  effectiveVerdict,
  raiseVerdict,
} from "./network";

const HASH = "hash-ukn3r8s9t1";

function order(partial: Partial<OrderVerdict> & Pick<OrderVerdict, "orderId" | "verdict">): OrderVerdict {
  return {
    tier: "TEXT_ONLY",
    headlineEn: "ok",
    headlineSw: "sawa",
    matchedPaymentId: null,
    checks: [],
    amountPaidKes: 2500,
    amountExpectedKes: 2500,
    ...partial,
  };
}

function report(orders: OrderVerdict[]): BatchReport {
  return {
    reportId: "r1",
    batchId: "b1",
    engineVersion: "test",
    createdAt: "2026-11-12T00:00:00.000Z",
    tier: "TEXT_ONLY",
    counts: { release: 1, review: 0, hold: 0 },
    moneyHeldKes: 0,
    orders,
    unmatchedPayments: [],
  };
}

describe("cross-seller network", () => {
  it("reviews when another shop's statement contains the code", () => {
    const engine = report([order({ orderId: "wanjiku-1", verdict: "RELEASE" })]);
    const { report: raised, reasonsByOrder } = applyNetworkHits(
      engine,
      new Map([["wanjiku-1", HASH]]),
      new Set([HASH]),
      new Set(),
    );
    expect(raised.orders[0]?.verdict).toBe("REVIEW");
    expect(reasonsByOrder.get("wanjiku-1")?.[0]?.en).toBe(CROSS_SHOP_STATEMENT.en);
    expect(raised.counts.review).toBe(1);
  });

  it("does not flag a seller against her own statement", () => {
    const engine = report([order({ orderId: "akinyi-1", verdict: "RELEASE", tier: "STATEMENT_VERIFIED" })]);
    const { report: raised, reasonsByOrder } = applyNetworkHits(
      engine,
      new Map([["akinyi-1", HASH]]),
      new Set(),
      new Set(),
    );
    expect(raised.orders[0]?.verdict).toBe("RELEASE");
    expect(reasonsByOrder.size).toBe(0);
  });

  it("reviews when another shop claimed the code and no statement has it", () => {
    const engine = report([order({ orderId: "two", verdict: "RELEASE" })]);
    const { report: raised, reasonsByOrder } = applyNetworkHits(
      engine,
      new Map([["two", HASH]]),
      new Set(),
      new Set([HASH]),
    );
    expect(raised.orders[0]?.verdict).toBe("REVIEW");
    expect(reasonsByOrder.get("two")?.[0]?.en).toBe(CROSS_SHOP_CLAIM.en);
  });

  it("never lowers HOLD", () => {
    expect(raiseVerdict("HOLD", "REVIEW")).toBe("HOLD");
    expect(raiseVerdict("HOLD", "RELEASE")).toBe("HOLD");
    expect(raiseVerdict("REVIEW", "HOLD")).toBe("HOLD");
  });

  it("restores the engine verdict when the seller dismisses the flag", () => {
    expect(effectiveVerdict("RELEASE", true, [{ id: "CROSS_SHOP_STATEMENT", en: CROSS_SHOP_STATEMENT.en, sw: CROSS_SHOP_STATEMENT.sw }])).toBe(
      "RELEASE",
    );
  });
});
