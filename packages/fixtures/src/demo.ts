/**
 * packages/fixtures/src/demo.ts
 * The sample story a judge can run in one tap: 13 orders, counting both copies of one reused code.
 * Dates are relative to `now`, so the sample does not go stale.
 */
import type { OrderInput, PaymentInput, StatementRowInput } from "@orderverify/engine";
import { makeCode, nairobiDay } from "./makeCode.js";
import { buildSms } from "./sms.js";

export interface DemoOrder {
  id: string;
  title: string;
  order: OrderInput;
  payment: PaymentInput | null;
  /** When set, the statement disagrees with the SMS on purpose. */
  statementPaidInKes: number | null;
  /** Omit the receipt from the statement. This is the honest-limit case. */
  hideFromStatement: boolean;
}

export interface DemoScenario {
  sellerName: string;
  orders: DemoOrder[];
  chatText: string;
  paymentsText: string;
  statementCsv: string;
}

/**
 * Build Akinyi's sample day.
 * @param now - Clock used to keep every date in the recent past
 * @returns Orders, a WhatsApp-style chat, the pasted SMS, and a statement CSV
 */
export function buildDemoScenario(now: Date): DemoScenario {
  const recent = nairobiDay(now, 1);
  const older = nairobiDay(now, 2);
  const codeDay = nairobiDay(now, 40);
  const reused = makeCode(older.year, older.month, older.day, 61);

  const specs: DemoOrder[] = [
    row("1-clean", "Genuine, exact match", recent, "Mary Wanjiku", "MARY WANJIKU", 2500, 2500, 11, "M-PESA"),
    row("2-spouse", "Paid from a spouse's phone", recent, "Mary", "JOHN OTIENO", 1800, 1800, 12, "M-PESA"),
    row("3-nickname", "Nickname vs legal name", recent, "Wanjiku", "JANE WANJIKU", 2200, 2200, 13, "M-PESA"),
    row("4-edited-amount", "Message says the full price, statement shows 250", recent, "Amina Hassan", "AMINA HASSAN", 2500, 2500, 14, "M-PESA", 250),
    editedDate(recent, codeDay),
    row("6a-reused-first", "First copy of a reused code", older, "Grace Njeri", "GRACE NJERI", 1500, 1500, 61, "M-PESA"),
    row("6b-reused-second", "Same code on a later order", recent, "Grace Njeri", "GRACE NJERI", 1500, 1500, 61, "M-PESA", null, false, reused, older.label),
    row("7-locked", "LOCKED balance", recent, "Samuel Kiptoo", "SAMUEL KIPTOO", 1400, 1400, 17, "M-PESA", null, false, undefined, undefined, true),
    row("8-sender", "Wrong sender label", recent, "Brian Otieno", "BRIAN OTIENO", 1750, 1750, 18, "0712000111"),
    row("9-partial", "Partial payment", recent, "Lydia Chebet", "LYDIA CHEBET", 4000, 1000, 19, "M-PESA"),
    row("10-fabricated", "Believable code that never arrived", recent, "Faith Aoko", "FAITH AOKO", 2700, 2700, 20, "M-PESA", null, true),
    row("11-missing", "No payment at all", recent, "Hassan Ali", "HASSAN ALI", 900, 0, 21, "M-PESA", null, false, undefined, undefined, false, true),
    row("12-overpay", "Overpayment", recent, "Oscar Mutua", "OSCAR MUTUA", 2000, 2300, 22, "M-PESA"),
  ];

  // The reused helper above inserted the first copy with seq 61 and the second also forced that code.
  // Drop the accidental extra if row() for 6a also generated seq 61. Both should share `reused`.
  const firstReuse = specs.find((item) => item.id === "6a-reused-first");
  const secondReuse = specs.find((item) => item.id === "6b-reused-second");
  if (firstReuse?.payment && secondReuse?.order) {
    firstReuse.payment.rawText = buildSms({
      code: reused,
      amount: 1500,
      name: "GRACE NJERI",
      dateLabel: older.label,
    });
    firstReuse.payment.paymentId = `p-${reused}-a`;
    firstReuse.order.claimedCode = reused;
    firstReuse.order.orderId = "6a-reused-first";
    firstReuse.statementPaidInKes = 1500;
  }

  const payments = specs.flatMap((item) => (item.payment ? [item.payment] : []));
  const statementRows = statementFor(specs);
  return {
    sellerName: "Akinyi",
    orders: specs,
    chatText: chatFor(specs),
    paymentsText: payments.map((item) => item.rawText).join("\n\n"),
    statementCsv: toCsv(statementRows),
  };
}

function row(
  id: string,
  title: string,
  when: ReturnType<typeof nairobiDay>,
  chat: string,
  mpesa: string,
  expected: number,
  paid: number,
  seq: number,
  sender: string,
  statementPaidInKes: number | null = null,
  hideFromStatement = false,
  forcedCode?: string,
  dateLabel?: string,
  locked = false,
  noPayment = false,
): DemoOrder {
  const code = forcedCode ?? makeCode(when.year, when.month, when.day, seq);
  const payment = noPayment
    ? null
    : {
        paymentId: `p-${id}`,
        rawText: buildSms({
          code,
          amount: paid,
          name: mpesa,
          dateLabel: dateLabel ?? when.label,
          locked,
        }),
        senderLabel: sender,
      };
  return {
    id,
    title,
    hideFromStatement,
    statementPaidInKes: noPayment ? null : (statementPaidInKes ?? paid),
    order: {
      orderId: id,
      customerName: chat,
      items: [{ name: "Dress", qty: 1, unitPriceKes: expected }],
      expectedAmountKes: expected,
      orderedAt: when.orderedAt,
      claimedCode: noPayment ? null : code,
    },
    payment,
  };
}

function editedDate(recent: ReturnType<typeof nairobiDay>, codeDay: ReturnType<typeof nairobiDay>): DemoOrder {
  const code = makeCode(codeDay.year, codeDay.month, codeDay.day, 15);
  return {
    id: "5-edited-date",
    title: "Code date and message date disagree",
    hideFromStatement: false,
    statementPaidInKes: 2500,
    order: {
      orderId: "5-edited-date",
      customerName: "Peter Ochieng",
      items: [{ name: "Shirt", qty: 1 }],
      expectedAmountKes: 2500,
      orderedAt: recent.orderedAt,
      claimedCode: code,
    },
    payment: {
      paymentId: "p-5-edited-date",
      rawText: buildSms({ code, amount: 2500, name: "PETER OCHIENG", dateLabel: recent.label }),
      senderLabel: "M-PESA",
    },
  };
}

function statementFor(orders: DemoOrder[]): StatementRowInput[] {
  const rows: StatementRowInput[] = [];
  for (const item of orders) {
    if (!item.payment || item.hideFromStatement || item.statementPaidInKes === null) continue;
    const code = item.order.claimedCode;
    if (!code) continue;
    rows.push({
      receiptNo: code,
      completedAt: new Date(new Date(item.order.orderedAt).getTime() + 75 * 60 * 1000).toISOString(),
      details: `Received from ${item.order.customerName}`,
      status: "Completed",
      paidInKes: item.statementPaidInKes,
      withdrawnKes: 0,
    });
  }
  return rows;
}

function chatFor(orders: DemoOrder[]): string {
  return orders
    .map((item) => {
      const at = new Date(item.order.orderedAt);
      const local = new Date(at.getTime() + 3 * 60 * 60 * 1000);
      const stamp = `${local.getUTCDate()}/${local.getUTCMonth() + 1}/${local.getUTCFullYear()}, ${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
      const price = item.order.expectedAmountKes ? `KES ${item.order.expectedAmountKes.toLocaleString("en-KE")}` : "price to confirm";
      return `${stamp} - ${item.order.customerName}: Hi Akinyi, I want the dress. ${price}.`;
    })
    .join("\n");
}

function toCsv(rows: StatementRowInput[]): string {
  const header = "Receipt No,Completion Time,Details,Status,Paid in,Withdrawn,Balance";
  const lines = rows.map((row) => {
    const when = new Date(row.completedAt);
    const local = new Date(when.getTime() + 3 * 60 * 60 * 1000);
    const stamp = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")} ${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}:00`;
    return [row.receiptNo, stamp, `"${row.details}"`, row.status, row.paidInKes ?? "", row.withdrawnKes ?? "", ""].join(",");
  });
  return [header, ...lines].join("\n");
}
