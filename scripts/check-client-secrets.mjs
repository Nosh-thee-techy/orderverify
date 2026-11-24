/**
 * scripts/check-client-secrets.mjs
 * Fails the build if a client component mentions a server secret.
 * The signer and the API keys must stay on the server.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../apps/web/src", import.meta.url));
const banned = ["AGENT_SECRET", "OZ_API_KEY", "ANTHROPIC_API_KEY", "RESEND_API_KEY", "CLERK_SECRET_KEY", "DATA_ENCRYPTION_KEY", "HASH_PEPPER"];
const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (!/\.(tsx|ts|jsx|js)$/.test(name)) continue;
    const text = readFileSync(path, "utf8");
    if (!text.includes('"use client"') && !text.includes("'use client'")) continue;
    for (const secret of banned) {
      if (text.includes(secret)) hits.push(`${path} mentions ${secret}`);
    }
  }
}

walk(root);
if (hits.length) {
  console.error(hits.join("\n"));
  process.exit(1);
}
console.log("No server secrets in client components.");
