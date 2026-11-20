/**
 * packages/engine/src/names.test.ts
 * Name matching must be generous about initials and strict about a shared full token.
 */
import { describe, expect, it } from "vitest";
import { jaroWinkler } from "./jaro.js";
import { scoreNames } from "./names.js";

describe("names", () => {
  it("scores the classic Jaro-Winkler pair as a near match", () => {
    expect(jaroWinkler("MARTHA", "MARHTA")).toBeGreaterThan(0.94);
  });

  it("treats a shared full token as strong, including an initial", () => {
    expect(scoreNames("Jane Wanjiku", "J. WANJIKU").band).toBe("strong");
    expect(scoreNames("Mary Achieng", "MARY ATIENO ACHIENG").band).toBe("strong");
  });

  it("warns when nothing overlaps", () => {
    expect(scoreNames("Mary", "JANE W").band).toBe("none");
  });

  it("calls a short nickname weak rather than strong", () => {
    const band = scoreNames("Kiki", "AKINYI WANJIKU").band;
    expect(band === "weak" || band === "none").toBe(true);
  });
});
