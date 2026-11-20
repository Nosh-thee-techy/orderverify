# Decisions

Assumptions and trade-offs made where the build prompt was silent, or where a platform constraint forced a choice. Newest entries are added as phases land.

## Remote host

Cursor's Origin CLI does not support native Windows. The git remote is a private GitHub repository created with `gh`, because the prompt requires a remote and a push after each phase.

## Workspaces

npm workspaces, not pnpm. npm is already available on this machine and keeps the one-command setup shorter.

## Local database

PostgreSQL 16 via Docker Compose for development. The schema is written for Postgres (numeric, timestamptz, jsonb) so the same migrations run on Neon or Supabase later.

## Where pure code lives

WhatsApp parsing, statement CSV parsing, phone redaction, the basic order extractor, and the weekly-cap calendar live in `packages/engine`. They are pure functions with no network access, so both the web app and the unit tests share one implementation. `verify-api` still has no database and no LLM.

## x402 bypass

`X402_MODE=bypass` is honoured only when `NODE_ENV` is not `production`. Both processes refuse to boot a bypass path in production. Bypass responses carry a header and the UI shows a full-width red banner: "BYPASS: not a real payment". Bypass rows are stored with status `bypassed` and count toward the weekly cap so the safety rail can be demonstrated without testnet USDC. They are never labelled as settled Stellar payments.

## Idempotency cache

The verification service has no database, so the idempotency cache is in memory. A repeat with the same `Idempotency-Key` returns the cached report before the payment middleware runs, so it is not charged again. A process restart clears the cache; that is acceptable for the demo and is called out as a deployment limit.

## Demo session

One seller row per browser, identified by an httpOnly cookie. No passwords. The first visit creates "Akinyi".

## Simulated wallet balance

`sellers.wallet_balance_usd` is a simulated M-Pesa-to-USDC top-up, labelled as simulated everywhere it appears. It is not the on-chain USDC balance. The on-chain payer is `AGENT_SECRET`. Each check also deducts the simulated balance so the wallet screen moves. The weekly cap is enforced independently and is the real safety rail.

## Accepted codes are recorded when the seller releases

A code is written to `seen_codes` when the seller marks that order released, not when the engine returns RELEASE. The second sample run (with a statement) must still be able to show a made-up receipt changing from "looks consistent" to held. Once the seller has accepted a code, a later batch that repeats it is held.

## Name matching never fails alone

A weak or missing name overlap is a warning (REVIEW), never a fail. Someone else (a spouse, a friend) may pay for the buyer. The rules do not call that fraud.

## Eval clock is pinned

The eval generator uses a fixed `now` (2026-11-20, noon Africa/Nairobi) and seed `20261120` so `eval-results.json` does not change every day. The in-app demo scenario uses the real current date so the sample stays inside the timestamp rules.

## Transaction-code year offset

`YEAR_LETTER_BASE = 2005` with A = 1, so 2026 is U. This follows the publicly reported Safaricom encoding (2024 = S, 2025 = T). It is a named constant so it can be corrected if real statements disagree.

## Dates in messages are day/month/year

Kenyan M-Pesa SMS dates are read as DD/MM/YY. `12/11/26` is 12 November 2026, which is what the code `UKC...` encodes.

## Desktop layout

A left rail appears at 1024px. The results view keeps a single column on small screens and opens the order detail as a bottom sheet; on wide screens the detail sits in a right-hand panel.

## Playwright

Not included. The prompt allows cutting it. Verification is Vitest plus a manual/browser pass of the UI.

## Kiswahili

User-facing strings exist in both `i18n/en.ts` and `i18n/sw.ts`. The Swahili is written for a Nairobi seller (standard Kiswahili, short sentences), not machine-translated jargon.

## Local Postgres port

This machine already runs PostgreSQL 16 on port 5432. Docker Compose publishes the demo database on host port 5433 so the two servers do not share a port. Inside the container Postgres still listens on 5432.

## x402 paywall package

`@x402/paywall` is not imported. It pulls wagmi, WalletConnect, Solana, and Algorand wallets, which filled the disk during install. The JSON API uses `@x402/express` only. `@stellar/stellar-sdk` is `^16.4.1` so it matches `@x402/stellar` and we do not install the older v13 tree as well.
