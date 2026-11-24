/**
 * services/verify-api/src/payment.ts
 * Mounts the x402 payment middleware. A request reaches the handler only after
 * the OpenZeppelin facilitator has settled a Stellar testnet USDC payment.
 */
import type { Express } from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";

/**
 * Whether live x402 can be mounted. Missing keys must not crash the process on boot.
 * @returns True when facilitator URL, API key, and pay-to account are all set
 */
export function paymentConfigured(): boolean {
  return Boolean(process.env.FACILITATOR_URL && process.env.OZ_API_KEY && process.env.SERVICE_RECIPIENT);
}

/**
 * Protect POST /v1/verify-batch with a ~$0.01 Stellar payment.
 * @param app - Express app that already has JSON parsing and the idempotency short-circuit
 */
export function mountPayment(app: Express): void {
  const network = stellarNetwork(process.env.STELLAR_NETWORK);
  const facilitatorUrl = process.env.FACILITATOR_URL;
  const apiKey = process.env.OZ_API_KEY;
  const payTo = process.env.SERVICE_RECIPIENT;
  if (!facilitatorUrl || !apiKey || !payTo) {
    throw new Error("Live x402 mode needs FACILITATOR_URL, OZ_API_KEY, and SERVICE_RECIPIENT.");
  }

  const facilitator = new HTTPFacilitatorClient({
    url: facilitatorUrl,
    createAuthHeaders: async () => {
      const headers = { Authorization: `Bearer ${apiKey}` };
      return { verify: headers, settle: headers, supported: headers };
    },
  });

  const resourceServer = new x402ResourceServer(facilitator).register(network, new ExactStellarScheme());
  const price = process.env.PRICE_USD ?? "0.01";

  app.use(
    paymentMiddleware(
      {
        "POST /v1/verify-batch": {
          accepts: [{ scheme: "exact", price: `$${price}`, network, payTo }],
          description: "OrderVerify: check a batch of orders against M-Pesa payment evidence",
          mimeType: "application/json",
        },
      },
      resourceServer,
    ),
  );
}

function stellarNetwork(value: string | undefined): `${string}:${string}` {
  const network = value && value.includes(":") ? value : "stellar:testnet";
  return network as `${string}:${string}`;
}
