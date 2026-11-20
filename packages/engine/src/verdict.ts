/**
 * packages/engine/src/verdict.ts
 * The only place a verdict is chosen. It looks at check statuses and nothing else.
 * A language model is not consulted, and cannot override the result.
 */
import { CheckResult, Verdict } from "./types.js";

/**
 * RELEASE when every judged check passed, REVIEW when something needs a look, HOLD when something failed.
 * @param checks - The checks that ran for one order
 * @returns The verdict
 */
export function computeVerdict(checks: CheckResult[]): Verdict {
  if (checks.some((check) => check.status === "fail")) return "HOLD";
  if (checks.some((check) => check.status === "warn")) return "REVIEW";
  return "RELEASE";
}

/**
 * The one sentence the seller should read first: the worst check, or a calm all-clear.
 * @param checks - Checks for one order
 * @param verdict - Already computed verdict
 * @returns English and Kiswahili headlines
 */
export function headlineFor(checks: CheckResult[], verdict: Verdict): { en: string; sw: string } {
  if (verdict === "RELEASE") {
    return { en: "Everything lines up.", sw: "Kila kitu kinaendana." };
  }
  const worst = checks.find((check) => check.status === "fail") ?? checks.find((check) => check.status === "warn");
  if (!worst) {
    return { en: "Everything lines up.", sw: "Kila kitu kinaendana." };
  }
  return { en: worst.plainEn, sw: worst.plainSw };
}
