/**
 * packages/engine/src/policy.ts
 * Weekly spend arithmetic. The agent must not pay once the seller's cap is used up.
 * Pending reservations count, so two clicks at the same moment cannot both slip through
 * once the caller has recorded the pending row inside a transaction.
 */

export interface CapInput {
  spentUsd: number;
  priceUsd: number;
  capKes: number;
  kesPerUsd: number;
}

/**
 * Decide whether another paid check would break the weekly cap.
 * @param input - Money already reserved this week, the next price, and the cap in shillings
 * @returns True when the next payment must not be sent
 */
export function wouldExceedCap(input: CapInput): boolean {
  if (input.capKes <= 0) return true;
  if (input.kesPerUsd <= 0) return true;
  const capUsd = input.capKes / input.kesPerUsd;
  // Compare in micro-dollars so 0.01 + 0.01 does not drift past the cap by a float error.
  const used = Math.round((input.spentUsd + input.priceUsd) * 1_000_000);
  const allowed = Math.round(capUsd * 1_000_000);
  return used > allowed;
}

/**
 * Shillings still available this week, for the cost line in the UI.
 * @param input - Same figures as the cap check, without assuming a new payment
 * @returns Remaining shillings, never below zero
 */
export function remainingCapKes(spentUsd: number, capKes: number, kesPerUsd: number): number {
  const spentKes = spentUsd * kesPerUsd;
  return Math.max(0, Math.round((capKes - spentKes) * 10) / 10);
}

/**
 * Convert the USDC price into the shilling figure we show the seller.
 * @param priceUsd - Price of one batch
 * @param kesPerUsd - Display rate
 * @returns Shillings, rounded to one decimal (0.01 USD at 129 is about 1.3)
 */
export function priceKes(priceUsd: number, kesPerUsd: number): number {
  return Math.round(priceUsd * kesPerUsd * 10) / 10;
}
