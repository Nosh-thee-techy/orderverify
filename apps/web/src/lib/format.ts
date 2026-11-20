/**
 * apps/web/src/lib/format.ts
 * Display helpers. Money the seller sees is in shillings, with USDC shown beside it.
 */

/**
 * Format a shilling amount.
 * @param amount - Whole shillings
 * @returns "KES 1,300"
 */
export function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

/**
 * Short date for lists.
 * @param iso - ISO timestamp
 * @param language - en or sw
 * @returns A medium date in that language
 */
export function formatWhen(iso: string, language: "en" | "sw"): string {
  return new Intl.DateTimeFormat(language === "sw" ? "sw-KE" : "en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Shorten a transaction hash for a chip.
 * @param hash - Full hash
 * @returns A shortened form, or an em dash
 */
export function shortHash(hash: string | null | undefined): string {
  if (!hash) return "—";
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

/**
 * Stellar Expert testnet link.
 * @param hash - Transaction hash
 * @returns The explorer URL, or null
 */
export function explorerUrl(hash: string | null | undefined): string | null {
  if (!hash) return null;
  return `https://stellar.expert/explorer/testnet/tx/${encodeURIComponent(hash)}`;
}
