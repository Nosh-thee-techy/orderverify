/**
 * apps/telegram-bot/src/bot.ts
 * Long-polling Telegram front-end for OrderVerify.
 * Comparison lab only — Kenya traffic is mostly WhatsApp; this bot reuses
 * packages/engine + services/verify-api so results match the web app.
 *
 * Env: TELEGRAM_BOT_TOKEN, VERIFY_API_URL, and X402_MODE=bypass for local lab runs.
 */
import { Bot, InlineKeyboard } from "grammy";
import { emptySession, getSession, setSession, type BotSession } from "./session.js";
import { formatReportSummary, runPaidCheck } from "./runCheck.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Set TELEGRAM_BOT_TOKEN in the repo-root .env");
  process.exit(1);
}

const bot = new Bot(token);

const copy = {
  en: {
    start:
      "OrderVerify on Telegram (comparison lab).\n\n1) Send your order chat as text\n2) Paste the M-Pesa messages\n3) Optionally send a statement CSV\n4) Tap Run check\n\nSame rules engine as the web app. Verdicts are not decided by AI.",
    sendChat: "Paste the buyer chat / order notes.",
    sendPayments: "Paste the M-Pesa confirmation messages (one or more).",
    sendStatement: "Optional: paste statement CSV text, or tap Skip statement.",
    ready: "Ready. Tap Run check when you want the paid verification.",
    running: "Running check…",
    needPayments: "I still need M-Pesa messages before I can run a check.",
    cleared: "Cleared. Send /start to begin again.",
  },
  sw: {
    start:
      "OrderVerify kwenye Telegram (maabara ya kulinganisha).\n\n1) Tuma mazungumzo ya oda\n2) Bandika ujumbe wa M-Pesa\n3) Hiari: taarifa ya CSV\n4) Gusa Run check\n\nInjini ile ile ya sheria kama tovuti. AI haiamui HOLD/RELEASE.",
    sendChat: "Bandika mazungumzo / maelezo ya oda.",
    sendPayments: "Bandika ujumbe wa uthibitisho wa M-Pesa.",
    sendStatement: "Hiari: bandika CSV ya taarifa, au gusa Skip statement.",
    ready: "Tayari. Gusa Run check.",
    running: "Inakagua…",
    needPayments: "Bado nahitaji ujumbe wa M-Pesa.",
    cleared: "Imefutwa. Tuma /start kuanza tena.",
  },
} as const;

function t(session: BotSession) {
  return copy[session.lang];
}

function mainKeyboard(session: BotSession) {
  return new InlineKeyboard()
    .text(session.lang === "sw" ? "Anza oda" : "Start chat", "step_chat")
    .row()
    .text("M-Pesa", "step_payments")
    .text(session.lang === "sw" ? "Taarifa" : "Statement", "step_statement")
    .row()
    .text("Run check", "run_check")
    .text(session.lang === "en" ? "Kiswahili" : "English", "toggle_lang");
}

bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = emptySession();
  setSession(userId, session);
  await ctx.reply(t(session).start, { reply_markup: mainKeyboard(session) });
});

bot.command("clear", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  setSession(userId, emptySession());
  await ctx.reply(t(getSession(userId)).cleared);
});

bot.callbackQuery("toggle_lang", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = getSession(userId);
  session.lang = session.lang === "en" ? "sw" : "en";
  setSession(userId, session);
  await ctx.answerCallbackQuery();
  await ctx.reply(t(session).start, { reply_markup: mainKeyboard(session) });
});

bot.callbackQuery("step_chat", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = getSession(userId);
  session.step = "await_chat";
  setSession(userId, session);
  await ctx.answerCallbackQuery();
  await ctx.reply(t(session).sendChat);
});

bot.callbackQuery("step_payments", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = getSession(userId);
  session.step = "await_payments";
  setSession(userId, session);
  await ctx.answerCallbackQuery();
  await ctx.reply(t(session).sendPayments);
});

bot.callbackQuery("step_statement", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = getSession(userId);
  session.step = "await_statement";
  setSession(userId, session);
  await ctx.answerCallbackQuery();
  await ctx.reply(t(session).sendStatement, {
    reply_markup: new InlineKeyboard().text("Skip statement", "skip_statement"),
  });
});

bot.callbackQuery("skip_statement", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = getSession(userId);
  session.statementText = "";
  session.step = "ready";
  setSession(userId, session);
  await ctx.answerCallbackQuery();
  await ctx.reply(t(session).ready, { reply_markup: mainKeyboard(session) });
});

bot.callbackQuery("run_check", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = getSession(userId);
  await ctx.answerCallbackQuery();
  if (!session.paymentsText.trim()) {
    await ctx.reply(t(session).needPayments, { reply_markup: mainKeyboard(session) });
    return;
  }
  const status = await ctx.reply(t(session).running);
  try {
    const report = await runPaidCheck({
      chatText: session.chatText,
      paymentsText: session.paymentsText,
      statementText: session.statementText,
    });
    const summary = formatReportSummary(report, session.lang);
    await ctx.api.editMessageText(status.chat.id, status.message_id, summary);
    // Lab-only: acknowledge a REVIEW line without writing to the web DB.
    const flagged = report.orders.filter((order) => order.verdict === "REVIEW" || order.verdict === "HOLD");
    if (flagged.length > 0) {
      await ctx.reply(
        session.lang === "sw"
          ? "Unaweza kuweka onyo, au kubonyeza 'Hii ni sawa' ili kukubali (maabara tu — haitabadilisha tovuti)."
          : "You can keep the warning, or tap This is fine to acknowledge it (lab only — does not change the web app).",
        {
          reply_markup: new InlineKeyboard().text(
            session.lang === "sw" ? "Hii ni sawa" : "This is fine",
            "ack_flags",
          ),
        },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Check failed";
    await ctx.api.editMessageText(
      status.chat.id,
      status.message_id,
      `Check failed.\n${message}\n\nFor the lab, run verify-api with X402_MODE=bypass (or attach a live x402 payment).`,
    );
  }
});

bot.callbackQuery("ack_flags", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = getSession(userId);
  await ctx.answerCallbackQuery();
  await ctx.reply(
    session.lang === "sw"
      ? "Umekubali onyo (maabara). Kwenye tovuti, onyo la duka lingine linahitaji thibitisho na inaandikwa kwenye rekodi."
      : "Acknowledged (lab). On the web app, cross-shop dismiss needs confirm and writes an audit row.",
  );
});

bot.on("message:text", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = getSession(userId);
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return;

  if (session.step === "await_chat") {
    session.chatText = text;
    session.step = "await_payments";
    setSession(userId, session);
    await ctx.reply(`Saved chat (${text.length} chars).\n${t(session).sendPayments}`);
    return;
  }
  if (session.step === "await_payments") {
    session.paymentsText = text;
    session.step = "await_statement";
    setSession(userId, session);
    await ctx.reply(`Saved payments.\n${t(session).sendStatement}`, {
      reply_markup: new InlineKeyboard().text("Skip statement", "skip_statement").row().text("Run check", "run_check"),
    });
    return;
  }
  if (session.step === "await_statement") {
    session.statementText = text;
    session.step = "ready";
    setSession(userId, session);
    await ctx.reply(t(session).ready, { reply_markup: mainKeyboard(session) });
    return;
  }
  await ctx.reply(t(session).start, { reply_markup: mainKeyboard(session) });
});

bot.catch((error) => {
  console.error("telegram bot error", error);
});

console.log("OrderVerify Telegram bot starting (long polling)…");
await bot.start();
