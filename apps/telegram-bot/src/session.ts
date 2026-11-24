/**
 * apps/telegram-bot/src/session.ts
 * In-memory chat state for one Telegram user while they assemble a check.
 * Not durable — fine for a comparison lab.
 */

export type Lang = "en" | "sw";

export type BotSession = {
  lang: Lang;
  /** Raw chat / order notes the seller pasted */
  chatText: string;
  /** M-Pesa confirmation paste */
  paymentsText: string;
  /** Optional CSV/text statement */
  statementText: string;
  step: "idle" | "await_chat" | "await_payments" | "await_statement" | "ready";
};

/**
 * Empty session for a new /start.
 * @returns Fresh session defaults (English)
 */
export function emptySession(): BotSession {
  return {
    lang: "en",
    chatText: "",
    paymentsText: "",
    statementText: "",
    step: "idle",
  };
}

const store = new Map<number, BotSession>();

/**
 * Load or create session state for a Telegram user id.
 * @param userId - Telegram user id
 */
export function getSession(userId: number): BotSession {
  const existing = store.get(userId);
  if (existing) return existing;
  const created = emptySession();
  store.set(userId, created);
  return created;
}

/**
 * Replace session state for a user.
 * @param userId - Telegram user id
 * @param next - New session
 */
export function setSession(userId: number, next: BotSession): void {
  store.set(userId, next);
}
