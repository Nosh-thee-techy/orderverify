/**
 * apps/web/src/server/ownership.test.ts
 * Seller A cannot read seller B's batch.
 */
import { describe, expect, it } from "vitest";
import { ownedOrNull } from "./ownership";

describe("ownership", () => {
  it("returns null when seller A asks for seller B's batch", () => {
    const batch = { id: "batch-b", sellerId: "user_wanjiku" };
    expect(ownedOrNull(batch, "user_akinyi")).toBeNull();
  });

  it("returns the row when the seller owns it", () => {
    const batch = { id: "batch-a", sellerId: "user_akinyi" };
    expect(ownedOrNull(batch, "user_akinyi")).toEqual(batch);
  });

  it("returns null when the batch is missing", () => {
    expect(ownedOrNull(undefined, "user_akinyi")).toBeNull();
  });
});
