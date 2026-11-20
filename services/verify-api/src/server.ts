/**
 * services/verify-api/src/server.ts
 * Process entry. Sells one batch verification for about $0.01 via x402 on Stellar.
 */
import dotenv from "dotenv";
import { resolve } from "node:path";

// npm runs this package with its own folder as cwd, so also read the repo-root .env
// before the app module reads any variables.
dotenv.config({ path: resolve(process.cwd(), "../../.env") });
dotenv.config();

const { createApp } = await import("./app.js");
const { isBypassEnabled } = await import("./bypass.js");

const port = Number(process.env.PORT ?? 4021);
const app = await createApp({ requirePayment: !isBypassEnabled() });

app.listen(port, () => {
  const mode = isBypassEnabled() ? "BYPASS (not a real payment)" : "live x402";
  console.log(`verify-api listening on ${port} (${mode})`);
});
