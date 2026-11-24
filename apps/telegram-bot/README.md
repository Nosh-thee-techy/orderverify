# OrderVerify Telegram bot (comparison lab)

Telegram is a small share of Kenya traffic. This bot exists so we can compare time-to-verdict and result readability against the web app. It reuses `packages/engine` and `services/verify-api` — same rules, same paid endpoint.

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. In the repo-root `.env`:

```bash
TELEGRAM_BOT_TOKEN=123456:ABC...
VERIFY_API_URL=http://localhost:4021
X402_MODE=bypass
```

For a fair local lab without testnet USDC, run verify-api in bypass. Production web stays `X402_MODE=live`.

3. Start API + bot:

```bash
npm run dev:api
npm run start -w @orderverify/telegram-bot
```

## Flow

`/start` → paste chat → paste M-Pesa → optional statement → **Run check** → summary with RELEASE / REVIEW / HOLD lines.

## Compare against web

Measure: time to first verdict, steps to completion, drop-off, how readable the held lines are.
