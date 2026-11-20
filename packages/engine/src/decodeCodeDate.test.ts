/**
 * packages/engine/src/decodeCodeDate.test.ts
 * The date hidden in an M-Pesa code is one of the strongest offline signals.
 * These cases are the ones the product prompt requires, plus month-end and leap day.
 */
import { describe, expect, it } from "vitest";
import { decodeCodeDate, encodeCodePrefix } from "./decodeCodeDate.js";

describe("decodeCodeDate", () => {
  it("reads 12 Nov 2026 from UKC", () => {
    expect(decodeCodeDate("UKC1234567")).toEqual({ year: 2026, month: 11, day: 12 });
  });

  it("reads 3 Oct 2026 from UJ3", () => {
    expect(decodeCodeDate("UJ31234567")).toEqual({ year: 2026, month: 10, day: 3 });
  });

  it("reads 31 Jan 2026 from UAV", () => {
    expect(decodeCodeDate("UAV1234567")).toEqual({ year: 2026, month: 1, day: 31 });
  });

  it("rejects an invalid month letter", () => {
    expect(decodeCodeDate("UZ11234567")).toBeNull();
  });

  it("rejects 31 April", () => {
    expect(decodeCodeDate("UDV1234567")).toBeNull();
  });

  it("accepts 29 Feb 2024 and rejects 29 Feb 2026", () => {
    expect(encodeCodePrefix(2024, 2, 29)).toBe("SBT");
    expect(decodeCodeDate("SBT1234567")).toEqual({ year: 2024, month: 2, day: 29 });
    expect(decodeCodeDate("UBT1234567")).toBeNull();
  });

  it("rejects a code that is not 10 characters", () => {
    expect(decodeCodeDate("UKC123")).toBeNull();
    expect(decodeCodeDate("not a code")).toBeNull();
  });

  it("round-trips a normal day", () => {
    expect(encodeCodePrefix(2026, 11, 12)).toBe("UKC");
  });
});
