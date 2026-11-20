/**
 * scripts/x402-smoke.mjs
 * One real paid call. Skipped unless X402_SMOKE=1, so CI does not need keys.
 * Expects 402 on a plain POST, then 200 and a transaction hash through the paying fetch.
 */
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

if (process.env.X402_SMOKE !== "1") {
  console.log("Skipping live smoke. Set X402_SMOKE=1 with AGENT_SECRET and a running verify-api.");
  process.exit(0);
}

const network = process.env.STELLAR_NETWORK ?? "stellar:testnet";
const base = process.env.VERIFY_API_URL ?? "http://localhost:4021";
const signer = createEd25519Signer(process.env.AGENT_SECRET, network);
const paidFetch = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network, client: new ExactStellarScheme(signer) }],
  spendControls: { maxAmountPerPayment: "$0.02" },
});

const body = JSON.stringify({
  batchId: "smoke",
  orders: [
    {
      orderId: "o1",
      customerName: "Mary Wanjiku",
      items: [{ name: "Dress", qty: 1 }],
      expectedAmountKes: 100,
      orderedAt: new Date().toISOString(),
      claimedCode: null,
    },
  ],
  payments: [],
  statementRows: null,
  priorCodes: [],
});

const unpaid = await fetch(`${base}/v1/verify-batch`, {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json", "idempotency-key": crypto.randomUUID() },
  body,
});
console.log("unpaid status", unpaid.status);
if (unpaid.status !== 402) {
  console.error("Expected 402 from an unpaid call.");
  process.exit(1);
}

const key = crypto.randomUUID();
const paid = await paidFetch(`${base}/v1/verify-batch`, {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json", "idempotency-key": key },
  body,
});
console.log("paid status", paid.status);
const header = paid.headers.get("PAYMENT-RESPONSE");
const settlement = header ? decodePaymentResponseHeader(header) : null;
console.log("settlement", settlement);
const tx = settlement?.transaction ?? settlement?.txHash ?? null;
if (paid.status !== 200 || !tx) {
  console.error("Expected 200 and a transaction hash.");
  process.exit(1);
}
console.log("explorer", `https://stellar.expert/explorer/testnet/tx/${tx}`);
