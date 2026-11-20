/**
 * services/verify-api/src/bypass.ts
 * Local-only switch that skips the Stellar payment. Production builds cannot turn this on.
 */

/**
 * Whether this process may skip a real x402 payment.
 * @returns True only outside production, and only when X402_MODE=bypass
 */
export function isBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.X402_MODE === "bypass";
}
