/**
 * packages/fixtures/src/evalSet.ts
 * A seeded, labelled set of 30 orders: 15 genuine and 15 forged.
 * The two made-up codes are realistic enough to pass a text-only check.
 * They are caught only when a statement is present. That miss is intentional.
 */
import type { OrderInput, PaymentInput, PriorCode, StatementRowInput } from "@orderverify/engine";
import { buildSms } from "./sms.js";
import { makeCode } from "./makeCode.js";

/** Pinned so the published catch rate does not drift when the calendar moves. */
export const EVAL_NOW = new Date("2026-11-20T09:00:00.000Z");
export const EVAL_SEED = 20261120;

export type ForgeryType =
  | "edited_amount"
  | "edited_date"
  | "edited_time"
  | "reused_code"
  | "fabricated_code"
  | "locked_balance"
  | "wrong_sender"
  | "partial_payment";

export interface EvalCase {
  id: string;
  truth: "genuine" | "forged";
  forgery: ForgeryType | null;
  /** Why a genuine order might still be flagged, so the false-flag rate stays explainable. */
  note: string;
  order: OrderInput;
  payment: PaymentInput | null;
}

export interface EvalBundle {
  seed: number;
  now: string;
  cases: EvalCase[];
  priorCodes: PriorCode[];
  statementRows: StatementRowInput[];
}

interface Day {
  year: number;
  month: number;
  day: number;
  label: string;
  orderedAt: string;
  paidAt: string;
}

/**
 * Build the 30-order eval bundle.
 * @returns Orders, payments, prior codes, and a statement that omits the two fabricated receipts
 */
export function buildEvalSet(): EvalBundle {
  const days = [1, 2, 3, 4, 5, 6, 7, 8].map((ago) => day(ago));
  const cases: EvalCase[] = [];
  let seq = 1;

  const genuineNames: [string, string][] = [
    ["Mary Wanjiku", "MARY WANJIKU"],
    ["Peter Ochieng", "PETER OCHIENG"],
    ["Amina Hassan", "AMINA HASSAN"],
    ["James Mwangi", "JAMES MWANGI"],
    ["Grace Njeri", "GRACE NJERI"],
    ["Samuel Kiptoo", "SAMUEL KIPTOO"],
    ["Faith Aoko", "FAITH AOKO"],
    ["Brian Otieno", "BRIAN OTIENO"],
    ["Lydia Chebet", "LYDIA CHEBET"],
    ["Hassan Ali", "HASSAN ALI"],
    ["Nelly Wairimu", "NELLY WAIRIMU"],
    ["Oscar Mutua", "OSCAR MUTUA"],
  ];

  genuineNames.forEach(([chat, mpesa], index) => {
    const when = days[index % days.length]!;
    const amount = 800 + index * 350;
    const code = makeCode(when.year, when.month, when.day, seq++);
    cases.push(genuine(when, chat, mpesa, amount, code, "Exact name and amount."));
  });

  // Three nickname cases. Two share a full token and should pass. One does not, and may false-flag.
  const nick = days[0]!;
  cases.push(
    genuine(nick, "Wanjiku", "JANE WANJIKU", 2200, makeCode(nick.year, nick.month, nick.day, seq++), "Shared surname."),
  );
  cases.push(
    genuine(nick, "Mary", "MARY ACHIENG", 1800, makeCode(nick.year, nick.month, nick.day, seq++), "Shared first name."),
  );
  cases.push(
    genuine(
      nick,
      "Kiki",
      "AKINYI WANJIKU",
      1600,
      makeCode(nick.year, nick.month, nick.day, seq++),
      "Nickname with no shared token. A warning here is an honest false flag.",
    ),
  );

  const priorCodes: PriorCode[] = [];
  const forgedDay = days[2]!;

  for (let i = 0; i < 4; i++) {
    const when = days[i % days.length]!;
    const code = makeCode(when.year, when.month, when.day, seq++);
    const expected = 3000 + i * 500;
    const paid = 200 + i * 50;
    cases.push(
      forged("edited_amount", when, "Mary Wanjiku", "MARY WANJIKU", expected, paid, code, "M-PESA", false, "Message amount is far below the order."),
    );
  }

  for (let i = 0; i < 2; i++) {
    const written = days[1]!;
    const encoded = days[6]!;
    const code = makeCode(encoded.year, encoded.month, encoded.day, seq++);
    cases.push(
      forged(
        "edited_date",
        { ...written, orderedAt: written.orderedAt },
        "Peter Ochieng",
        "PETER OCHIENG",
        2500,
        2500,
        code,
        "M-PESA",
        false,
        "The written date is not the date inside the code.",
        written.label,
      ),
    );
  }

  const futureLabel = "21/11/26";
  const futureCode = makeCode(forgedDay.year, forgedDay.month, forgedDay.day, seq++);
  cases.push(
    forged(
      "edited_time",
      forgedDay,
      "Grace Njeri",
      "GRACE NJERI",
      1900,
      1900,
      futureCode,
      "M-PESA",
      false,
      "The message is dated after the eval clock.",
      futureLabel,
      "3:00 PM",
    ),
  );

  for (let i = 0; i < 3; i++) {
    const when = days[3]!;
    const code = makeCode(when.year, when.month, when.day, 900 + i);
    priorCodes.push({ code, orderRef: `OLD-${i + 1}`, seenAt: "2026-11-02T09:00:00.000Z" });
    cases.push(
      forged("reused_code", when, "James Mwangi", "JAMES MWANGI", 2100, 2100, code, "M-PESA", false, "Code was accepted on an earlier order."),
    );
  }

  for (let i = 0; i < 2; i++) {
    const when = days[1]!;
    const code = makeCode(when.year, when.month, when.day, seq++);
    cases.push(
      forged(
        "fabricated_code",
        when,
        "Amina Hassan",
        "AMINA HASSAN",
        2700,
        2700,
        code,
        "M-PESA",
        false,
        "Looks consistent from the text alone. The receipt is absent from the statement.",
        undefined,
        undefined,
        false,
      ),
    );
  }

  const lockedWhen = days[4]!;
  cases.push(
    forged(
      "locked_balance",
      lockedWhen,
      "Faith Aoko",
      "FAITH AOKO",
      1400,
      1400,
      makeCode(lockedWhen.year, lockedWhen.month, lockedWhen.day, seq++),
      "M-PESA",
      true,
      "Balance line says LOCKED.",
    ),
  );

  const senderWhen = days[4]!;
  cases.push(
    forged(
      "wrong_sender",
      senderWhen,
      "Brian Otieno",
      "BRIAN OTIENO",
      1750,
      1750,
      makeCode(senderWhen.year, senderWhen.month, senderWhen.day, seq++),
      "0712000111",
      false,
      "The SMS sender is a phone number, not M-PESA.",
    ),
  );

  const partialWhen = days[5]!;
  cases.push(
    forged(
      "partial_payment",
      partialWhen,
      "Lydia Chebet",
      "LYDIA CHEBET",
      4000,
      1000,
      makeCode(partialWhen.year, partialWhen.month, partialWhen.day, seq++),
      "M-PESA",
      false,
      "Only part of the order was paid.",
    ),
  );

  const statementRows: StatementRowInput[] = [];
  for (const item of cases) {
    if (!item.payment) continue;
    if (item.forgery === "fabricated_code") continue;
    const amount = readAmount(item.payment.rawText);
    const when = item.order.orderedAt;
    statementRows.push({
      receiptNo: codeOf(item.payment.rawText),
      completedAt: new Date(new Date(when).getTime() + 75 * 60 * 1000).toISOString(),
      details: `Received from ${item.order.customerName}`,
      status: "Completed",
      paidInKes: amount,
      withdrawnKes: 0,
    });
  }

  return {
    seed: EVAL_SEED,
    now: EVAL_NOW.toISOString(),
    cases,
    priorCodes,
    statementRows,
  };
}

function genuine(when: Day, chat: string, mpesa: string, amount: number, code: string, note: string): EvalCase {
  return {
    id: `g-${code}`,
    truth: "genuine",
    forgery: null,
    note,
    order: {
      orderId: `g-${code}`,
      customerName: chat,
      items: [{ name: "Dress", qty: 1, unitPriceKes: amount }],
      expectedAmountKes: amount,
      orderedAt: when.orderedAt,
      claimedCode: code,
    },
    payment: {
      paymentId: `p-${code}`,
      rawText: buildSms({ code, amount, name: mpesa, dateLabel: when.label }),
      senderLabel: "M-PESA",
    },
  };
}

function forged(
  forgery: ForgeryType,
  when: Day,
  chat: string,
  mpesa: string,
  expected: number,
  paid: number,
  code: string,
  sender: string,
  locked: boolean,
  note: string,
  dateLabel?: string,
  time?: string,
  includeInStatement = true,
): EvalCase {
  void includeInStatement;
  return {
    id: `f-${code}`,
    truth: "forged",
    forgery,
    note,
    order: {
      orderId: `f-${code}`,
      customerName: chat,
      items: [{ name: "Dress", qty: 1 }],
      expectedAmountKes: expected,
      orderedAt: when.orderedAt,
      claimedCode: code,
    },
    payment: {
      paymentId: `p-${code}`,
      rawText: buildSms({ code, amount: paid, name: mpesa, dateLabel: dateLabel ?? when.label, time, locked }),
      senderLabel: sender,
    },
  };
}

function day(daysAgo: number): Day {
  const local = new Date(EVAL_NOW.getTime() + 3 * 60 * 60 * 1000);
  const midnight = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysAgo));
  const year = midnight.getUTCFullYear();
  const month = midnight.getUTCMonth() + 1;
  const dayNum = midnight.getUTCDate();
  return {
    year,
    month,
    day: dayNum,
    label: `${dayNum}/${month}/${String(year).slice(2)}`,
    orderedAt: new Date(Date.UTC(year, month - 1, dayNum, 13, 0) - 3 * 60 * 60 * 1000).toISOString(),
    paidAt: new Date(Date.UTC(year, month - 1, dayNum, 14, 15) - 3 * 60 * 60 * 1000).toISOString(),
  };
}

function codeOf(raw: string): string {
  return raw.slice(0, 10);
}

function readAmount(raw: string): number {
  const match = raw.match(/Ksh([0-9,]+)/);
  return Number((match?.[1] ?? "0").replace(/,/g, ""));
}
