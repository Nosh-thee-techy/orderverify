/**
 * apps/web/src/server/agent/x402Client.ts
 * Pays the verification service with the agent wallet. The secret never leaves the server.
 * In local bypass mode this file is not asked to sign anything.
 */
import "server-only";
import { decodePaymentResponseHeader } from "@x402/fetch";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const NETWORK = stellarNetwork(process.env.STELLAR_NETWORK);

export interface SettlementView {
  txHash: string | null;
  payer: string | null;
  network: string | null;
  success: boolean | null;
  raw: unknown;
}

/**
 * True only for local UI work. Production ignores X402_MODE=bypass.
 * @returns Whether this process may skip a real Stellar payment
 */
export function isBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.X402_MODE === "bypass";
}

/**
 * Fetch that signs a Stellar USDC payment when the service answers 402.
 * Built lazily so a missing AGENT_SECRET does not crash bypass mode at import time.
 * @returns A fetch function with a hard $0.02 ceiling on top of our weekly cap
 */
export function fetchWithPayment(): typeof fetch {
  const secret = process.env.AGENT_SECRET;
  if (!secret) throw new Error("AGENT_SECRET is not set");
  // createEd25519Signer wants the raw S... secret. Do not wrap it in Keypair.fromSecret.
  const signer = createEd25519Signer(secret, NETWORK);
  return wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [{ network: NETWORK, client: new ExactStellarScheme(signer) }],
    spendControls: { maxAmountPerPayment: "$0.02" },
  });
}

/**
 * Read the PAYMENT-RESPONSE header. Field names vary by package version, so this maps defensively.
 * @param res - The response from a paid call
 * @returns The transaction hash and payer when the header is present
 */
export function readSettlement(res: Response): SettlementView | null {
  const rawHeader = res.headers.get("PAYMENT-RESPONSE") ?? res.headers.get("payment-response");
  if (!rawHeader) return null;
  const decoded = decodePaymentResponseHeader(rawHeader) as Record<string, unknown>;
  const txHash = firstString(decoded, ["transaction", "txHash", "tx_hash", "hash"]);
  const payer = firstString(decoded, ["payer", "from"]);
  const network = firstString(decoded, ["network"]) ?? NETWORK;
  const success = typeof decoded.success === "boolean" ? decoded.success : null;
  return { txHash, payer, network, success, raw: decoded };
}

function stellarNetwork(value: string | undefined): `${string}:${string}` {
  const network = value && value.includes(":") ? value : "stellar:testnet";
  return network as `${string}:${string}`;
}

function firstString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/**
 * Stellar Expert link for a testnet transaction.
 * @param txHash - Hex or base64 hash returned by the facilitator
 * @returns A URL, or null when there is no hash
 */
export function explorerUrl(txHash: string | null): string | null {
  if (!txHash) return null;
  return `https://stellar.expert/explorer/testnet/tx/${encodeURIComponent(txHash)}`;
}
