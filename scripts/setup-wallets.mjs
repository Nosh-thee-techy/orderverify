/**
 * scripts/setup-wallets.mjs
 * Creates two Stellar testnet accounts for the demo: the service that receives USDC,
 * and the agent that pays. Friendbot funds both with XLM. A USDC trustline is added to each.
 * Getting testnet USDC and an OpenZeppelin API key still needs a person. Those steps are printed.
 */
import { writeFileSync, existsSync } from "node:fs";
import { Keypair, Horizon, Asset, Operation, TransactionBuilder, Networks } from "@stellar/stellar-sdk";

const HORIZON = "https://horizon-testnet.stellar.org";
const FRIEND = "https://friendbot.stellar.org";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const USDC = new Asset("USDC", USDC_ISSUER);

const recipient = Keypair.random();
const agent = Keypair.random();

console.log("1. Generated two testnet keypairs.");
console.log("   SERVICE_RECIPIENT", recipient.publicKey());
console.log("   AGENT public     ", agent.publicKey());

await fund(recipient.publicKey());
await fund(agent.publicKey());
console.log("2. Friendbot funded both accounts with testnet XLM.");

await trustline(recipient);
await trustline(agent);
console.log("3. Added a USDC trustline to both. Issuer:", USDC_ISSUER);

console.log("\nStill manual, because both sites use a captcha:");
console.log("  (a) Get testnet USDC for the AGENT account at https://faucet.circle.com/");
console.log("      Address:", agent.publicKey());
console.log("  (b) Create OZ_API_KEY at https://channels.openzeppelin.com/testnet/gen");
console.log("\nThe classic G... address is payTo and the trustline account.");
console.log("The SAC contract the protocol calls is exported as USDC_TESTNET_ADDRESS from @x402/stellar.");

const envPath = new URL("../.env", import.meta.url);
if (existsSync(envPath)) {
  console.log("\n.env already exists. Not overwriting. Paste these values yourself:");
} else {
  const example = await fetchText(new URL("../.env.example", import.meta.url));
  const filled = example
    .replace("SERVICE_RECIPIENT=", `SERVICE_RECIPIENT=${recipient.publicKey()}`)
    .replace("AGENT_SECRET=", `AGENT_SECRET=${agent.secret()}`);
  writeFileSync(envPath, filled);
  console.log("\nWrote .env with the two keys. It is gitignored.");
}
console.log("\nAGENT_SECRET (keep this out of git and out of the browser):");
console.log(agent.secret());

async function fund(publicKey) {
  const response = await fetch(`${FRIEND}?addr=${encodeURIComponent(publicKey)}`);
  if (!response.ok) throw new Error(`Friendbot failed for ${publicKey}: ${response.status}`);
}

async function trustline(keypair) {
  const server = new Horizon.Server(HORIZON);
  const account = await server.loadAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.changeTrust({ asset: USDC }))
    .setTimeout(60)
    .build();
  tx.sign(keypair);
  await server.submitTransaction(tx);
}

async function fetchText(url) {
  const { readFileSync } = await import("node:fs");
  return readFileSync(url, "utf8");
}
