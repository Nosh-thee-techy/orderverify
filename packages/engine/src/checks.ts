/**
 * packages/engine/src/checks.ts
 * One pure function per fraud check. Each returns a CheckResult and never decides
 * the final verdict; computeVerdict does that from the statuses alone.
 */
import { decodeCodeDate } from "./decodeCodeDate.js";
import { minutesApart, parseKenyaDate, parseKenyaDateTime, shortDate } from "./dates.js";
import { scoreNames } from "./names.js";
import { CheckResult, MpesaFields, PriorCode, StatementRow } from "./types.js";

export interface PaymentView {
  paymentId: string;
  fields: MpesaFields;
  senderLabel: string | null;
  rawText: string;
  paidAt: Date | null;
}

/**
 * Does this text look like a real M-Pesa confirmation?
 * @param parsedOk - Whether the parser found a usable message
 * @param fields - Extracted fields
 * @returns Fail when the code is the wrong shape. Warn when a key clause is missing.
 */
export function checkFormat(parsedOk: boolean, fields: MpesaFields): CheckResult {
  const code = fields.code;
  const codeOk = Boolean(code && /^[A-Z0-9]{10}$/.test(code));
  if (!codeOk) {
    return result("FORMAT", "fail", "Message format", "Muundo wa ujumbe", "This message doesn't look like a standard M-Pesa confirmation.", "Ujumbe huu hauonekani kama uthibitisho wa kawaida wa M-Pesa.", {
      code: code ?? null,
    });
  }
  if (!parsedOk || !fields.hasConfirmedWord) {
    return result("FORMAT", "warn", "Message format", "Muundo wa ujumbe", "This message doesn't look like a standard M-Pesa confirmation.", "Ujumbe huu hauonekani kama uthibitisho wa kawaida wa M-Pesa.", {
      confirmed: fields.hasConfirmedWord ? "yes" : "no",
    });
  }
  return result("FORMAT", "pass", "Message format", "Muundo wa ujumbe", "This looks like a normal M-Pesa confirmation.", "Huu unaonekana kama uthibitisho wa kawaida wa M-Pesa.", {
    code,
  });
}

/**
 * Compare the date written in the SMS with the date carried inside the code.
 * @param fields - Parsed message
 * @returns Fail when both dates are readable and they differ. Skip when either is missing.
 */
export function checkCodeDate(fields: MpesaFields): CheckResult {
  const decoded = fields.code ? decodeCodeDate(fields.code) : null;
  const written = fields.date ? parseKenyaDate(fields.date) : null;
  if (!decoded || !written) {
    return result("CODE_DATE", "skip", "Code date", "Tarehe ya kodi", "The code date could not be compared with the message.", "Tarehe iliyo ndani ya kodi haikuweza kulinganishwa na ujumbe.", {
      code: fields.code,
      messageDate: fields.date,
    });
  }
  const same =
    written.getUTCFullYear() === decoded.year &&
    written.getUTCMonth() + 1 === decoded.month &&
    written.getUTCDate() === decoded.day;
  const fromCode = shortDate(decoded.year, decoded.month, decoded.day);
  const fromMessage = shortDate(written.getUTCFullYear(), written.getUTCMonth() + 1, written.getUTCDate());
  if (!same) {
    return result(
      "CODE_DATE",
      "fail",
      "Code date",
      "Tarehe ya kodi",
      `The code says ${fromCode} but the message says ${fromMessage}. Real codes carry their own date.`,
      `Kodi inasema ${fromCode} lakini ujumbe unasema ${fromMessage}. Kodi halisi hubeba tarehe yake.`,
      { claimed: fromMessage, fromCode },
    );
  }
  return result("CODE_DATE", "pass", "Code date", "Tarehe ya kodi", "The date in the code matches the date in the message.", "Tarehe iliyo ndani ya kodi inafanana na tarehe ya ujumbe.", {
    date: fromCode,
  });
}

/**
 * When the seller exported SMS with a sender label, it must be M-PESA.
 * A paste with no label cannot prove the sender, so the check is skipped and says so.
 * @param senderLabel - SMS sender, or null when the text was pasted by hand
 */
export function checkSender(senderLabel: string | null): CheckResult {
  if (!senderLabel) {
    return result("SENDER", "skip", "Message sender", "Mtumaji wa ujumbe", "No sender label was included, so we could not confirm this came from M-PESA.", "Hakukuwa na jina la mtumaji, kwa hiyo hatukuweza kuthibitisha kuwa ulitoka M-PESA.", {
      sender: null,
    });
  }
  const normalized = senderLabel.toUpperCase().replace(/[^A-Z]/g, "");
  if (normalized === "MPESA") {
    return result("SENDER", "pass", "Message sender", "Mtumaji wa ujumbe", "The message is labelled as coming from M-PESA.", "Ujumbe umeandikwa kuwa umetoka M-PESA.", {
      sender: senderLabel,
    });
  }
  return result("SENDER", "fail", "Message sender", "Mtumaji wa ujumbe", "This text came from a phone number, not from M-PESA.", "Maandishi haya yametoka nambari ya simu, si kutoka M-PESA.", {
    sender: senderLabel,
  });
}

/**
 * Safaricom has warned that fake or recycled messages show a LOCKED balance.
 * @param fields - Parsed message
 */
export function checkBalanceLocked(fields: MpesaFields): CheckResult {
  const text = fields.balanceText ?? "";
  if (/locked/i.test(text)) {
    return result("BALANCE_LOCKED", "fail", "Balance text", "Salio", "The balance shows LOCKED, a known sign of a copied message.", "Salio linaonyesha LOCKED, ishara inayojulikana ya ujumbe ulionakiliwa.", {
      balance: text,
    });
  }
  if (!text) {
    return result("BALANCE_LOCKED", "skip", "Balance text", "Salio", "The message did not include a balance line.", "Ujumbe haukuwa na mstari wa salio.", {
      balance: null,
    });
  }
  return result("BALANCE_LOCKED", "pass", "Balance text", "Salio", "The balance line does not say LOCKED.", "Mstari wa salio hausemi LOCKED.", {
    balance: text,
  });
}

/**
 * A transaction code can only belong to one order.
 * @param code - Code on this order's payment
 * @param orderId - This order
 * @param earlierOrderId - Another order in this batch that already used the code, if any
 * @param prior - A code this seller already accepted on a previous day, if any
 * @param isFirstOfDuplicate - True when this order is the earlier of two copies in the same batch
 */
export function checkDuplicateCode(
  code: string | null,
  orderId: string,
  earlierOrderId: string | null,
  prior: PriorCode | null,
  isFirstOfDuplicate: boolean,
): CheckResult {
  if (!code) {
    return result("DUPLICATE_CODE", "skip", "Code reuse", "Kodi iliyotumika tena", "There is no code to compare with earlier payments.", "Hakuna kodi ya kulinganisha na malipo ya awali.", {
      code: null,
    });
  }
  if (prior) {
    return result("DUPLICATE_CODE", "fail", "Code reuse", "Kodi iliyotumika tena", `This code was already used for order #${prior.orderRef}.`, `Kodi hii ilishatumika kwa oda #${prior.orderRef}.`, {
      code,
      earlierOrder: prior.orderRef,
      seenAt: prior.seenAt,
    });
  }
  if (earlierOrderId && earlierOrderId !== orderId) {
    return result("DUPLICATE_CODE", "fail", "Code reuse", "Kodi iliyotumika tena", `This code was already used for order #${earlierOrderId}.`, `Kodi hii ilishatumika kwa oda #${earlierOrderId}.`, {
      code,
      earlierOrder: earlierOrderId,
    });
  }
  if (isFirstOfDuplicate) {
    return result("DUPLICATE_CODE", "warn", "Code reuse", "Kodi iliyotumika tena", "This code also appears on another order in this check.", "Kodi hii pia imeonekana kwenye oda nyingine katika ukaguzi huu.", {
      code,
    });
  }
  return result("DUPLICATE_CODE", "pass", "Code reuse", "Kodi iliyotumika tena", "This code has not been used on another order.", "Kodi hii haijatumika kwenye oda nyingine.", {
    code,
  });
}

/**
 * Compare what the buyer paid with what the order costs.
 * Overpayment is a warning (it may be a delivery fee). Underpayment is a fail.
 * @param paid - Amount in the message, or null
 * @param expected - Amount on the order, or null when the chat never named a price
 */
export function checkAmount(paid: number | null, expected: number | null): CheckResult {
  if (expected === null) {
    return result("AMOUNT", "skip", "Amount", "Kiasi", "Add the order amount so we can compare it with the payment.", "Ongeza kiasi cha oda ili tukilinganishe na malipo.", {
      paid,
      expected: null,
    });
  }
  if (paid === null) {
    return result("AMOUNT", "skip", "Amount", "Kiasi", "The message did not include an amount we could read.", "Ujumbe haukuwa na kiasi tulichoweza kusoma.", {
      paid: null,
      expected,
    });
  }
  if (paid < expected) {
    return result("AMOUNT", "fail", "Amount", "Kiasi", `They paid KES ${paid.toLocaleString("en-KE")} but the order is KES ${expected.toLocaleString("en-KE")}.`, `Wamelipa KES ${paid.toLocaleString("en-KE")} lakini oda ni KES ${expected.toLocaleString("en-KE")}.`, {
      paid,
      expected,
    });
  }
  if (paid > expected) {
    return result("AMOUNT", "warn", "Amount", "Kiasi", `They paid KES ${paid.toLocaleString("en-KE")}, which is more than the order of KES ${expected.toLocaleString("en-KE")}. It may include a delivery fee.`, `Wamelipa KES ${paid.toLocaleString("en-KE")}, zaidi ya oda ya KES ${expected.toLocaleString("en-KE")}. Huenda ni pamoja na nauli.`, {
      paid,
      expected,
    });
  }
  return result("AMOUNT", "pass", "Amount", "Kiasi", "The amount paid matches the order.", "Kiasi kilicholipwa kinafanana na oda.", {
    paid,
    expected,
  });
}

/**
 * Fuzzy-match the payer's name to the chat. Never a fail on its own:
 * a friend or spouse may pay for the buyer.
 * @param customerName - Name in the chat
 * @param senderName - Name on the M-Pesa message
 */
export function checkName(customerName: string, senderName: string | null): CheckResult {
  if (!senderName) {
    return result("NAME", "skip", "Payer name", "Jina la mlipaji", "The message did not include a payer name.", "Ujumbe haukuwa na jina la mlipaji.", {
      customer: customerName,
      payer: null,
    });
  }
  const scored = scoreNames(customerName, senderName);
  if (scored.band === "strong") {
    return result("NAME", "pass", "Payer name", "Jina la mlipaji", "The payer name lines up with the chat.", "Jina la mlipaji linafanana na mazungumzo.", {
      customer: customerName,
      payer: senderName,
      score: Number(scored.score.toFixed(2)),
    });
  }
  return result("NAME", "warn", "Payer name", "Jina la mlipaji", `Paid by ${senderName.toUpperCase()} but the chat is with ${customerName}. Someone else may have paid, ask.`, `Imelipwa na ${senderName.toUpperCase()} lakini mazungumzo ni na ${customerName}. Huenda mtu mwingine amelipa, uliza.`, {
    customer: customerName,
    payer: senderName,
    score: Number(scored.score.toFixed(2)),
  });
}

/**
 * Place the payment on a timeline against the order and against `now`.
 * Night-time payments are normal for M-Pesa and are not flagged.
 * @param paidAt - When the message says the money moved
 * @param orderedAt - When the order was placed
 * @param now - Clock injected by the caller
 */
export function checkTimestamp(paidAt: Date | null, orderedAt: Date, now: Date): CheckResult {
  if (!paidAt) {
    return result("TIMESTAMP", "skip", "Payment time", "Muda wa malipo", "The payment time could not be read.", "Muda wa malipo haukusomwa.", {
      paidAt: null,
    });
  }
  const futureLimit = now.getTime() + 5 * 60 * 1000;
  if (paidAt.getTime() > futureLimit) {
    return result("TIMESTAMP", "fail", "Payment time", "Muda wa malipo", "This payment is dated after today.", "Malipo haya yameandikwa baada ya leo.", {
      paidAt: paidAt.toISOString(),
      now: now.toISOString(),
    });
  }
  const hourBeforeOrder = orderedAt.getTime() - 60 * 60 * 1000;
  if (paidAt.getTime() < hourBeforeOrder) {
    return result("TIMESTAMP", "warn", "Payment time", "Muda wa malipo", "This payment is more than an hour before the order message.", "Malipo haya yalitokea zaidi ya saa moja kabla ya ujumbe wa oda.", {
      paidAt: paidAt.toISOString(),
      orderedAt: orderedAt.toISOString(),
    });
  }
  const weekAfter = orderedAt.getTime() + 7 * 24 * 60 * 60 * 1000;
  if (paidAt.getTime() > weekAfter) {
    return result("TIMESTAMP", "warn", "Payment time", "Muda wa malipo", "This payment is more than 7 days after the order.", "Malipo haya yametokea zaidi ya siku 7 baada ya oda.", {
      paidAt: paidAt.toISOString(),
      orderedAt: orderedAt.toISOString(),
    });
  }
  return result("TIMESTAMP", "pass", "Payment time", "Muda wa malipo", "The payment time sits sensibly next to the order.", "Muda wa malipo unalingana na oda.", {
    paidAt: paidAt.toISOString(),
  });
}

/**
 * Every order needs a payment. This fails when matching found nothing.
 * @param matched - Whether a payment was assigned
 */
export function checkMatchFound(matched: boolean): CheckResult {
  if (!matched) {
    return result("MATCH_FOUND", "fail", "Payment found", "Malipo yamepatikana", "No payment found for this order.", "Hakuna malipo yaliyopatikana kwa oda hii.", {
      matched: "no",
    });
  }
  return result("MATCH_FOUND", "pass", "Payment found", "Malipo yamepatikana", "A payment was matched to this order.", "Malipo yameunganishwa na oda hii.", {
    matched: "yes",
  });
}

/**
 * The receipt number must appear on the statement as money in.
 * @param code - Code from the message
 * @param row - Matching statement row, if any
 */
export function checkStatementFound(code: string | null, row: StatementRow | null): CheckResult {
  const credit = row && (row.paidInKes ?? 0) > 0;
  if (credit) {
    return result("STATEMENT_FOUND", "pass", "On your statement", "Kwenye taarifa yako", "This receipt is on your M-Pesa statement as money in.", "Risiti hii iko kwenye taarifa yako ya M-Pesa kama pesa iliyoingia.", {
      code,
      paidInKes: row?.paidInKes ?? null,
    });
  }
  return result("STATEMENT_FOUND", "fail", "On your statement", "Kwenye taarifa yako", "This code is not on your M-Pesa statement as money in.", "Kodi hii haiko kwenye taarifa yako ya M-Pesa kama pesa iliyoingia.", {
    code,
  });
}

/**
 * The statement amount and the message amount must agree.
 * A message edited to a bigger figure fails here even when the text looks perfect.
 * @param messageAmount - Amount read from the SMS
 * @param statementAmount - Paid-in figure from the statement
 */
export function checkStatementAmount(messageAmount: number | null, statementAmount: number | null): CheckResult {
  if (messageAmount === null || statementAmount === null) {
    return result("STATEMENT_AMOUNT", "skip", "Statement amount", "Kiasi kwenye taarifa", "The statement amount could not be compared.", "Kiasi cha taarifa hakikuweza kulinganishwa.", {
      messageAmount,
      statementAmount,
    });
  }
  if (messageAmount !== statementAmount) {
    return result("STATEMENT_AMOUNT", "fail", "Statement amount", "Kiasi kwenye taarifa", `The message says KES ${messageAmount.toLocaleString("en-KE")} but your statement shows KES ${statementAmount.toLocaleString("en-KE")}.`, `Ujumbe unasema KES ${messageAmount.toLocaleString("en-KE")} lakini taarifa yako inaonyesha KES ${statementAmount.toLocaleString("en-KE")}.`, {
      messageAmount,
      statementAmount,
    });
  }
  return result("STATEMENT_AMOUNT", "pass", "Statement amount", "Kiasi kwenye taarifa", "The message amount matches your statement.", "Kiasi cha ujumbe kinafanana na taarifa yako.", {
    messageAmount,
    statementAmount,
  });
}

/**
 * Statement completion time should be within two minutes of the SMS time.
 * @param messageAt - Time read from the SMS
 * @param statementAt - Completion time on the statement
 */
export function checkStatementTime(messageAt: Date | null, statementAt: Date | null): CheckResult {
  if (!messageAt || !statementAt) {
    return result("STATEMENT_TIME", "skip", "Statement time", "Muda kwenye taarifa", "The statement time could not be compared.", "Muda wa taarifa haukuweza kulinganishwa.", {
      messageAt: messageAt?.toISOString() ?? null,
      statementAt: statementAt?.toISOString() ?? null,
    });
  }
  const gap = minutesApart(messageAt, statementAt);
  if (gap > 2) {
    return result("STATEMENT_TIME", "warn", "Statement time", "Muda kwenye taarifa", "The statement time is more than two minutes away from the message.", "Muda wa taarifa uko zaidi ya dakika mbili mbali na ujumbe.", {
      minutesApart: Math.round(gap),
    });
  }
  return result("STATEMENT_TIME", "pass", "Statement time", "Muda kwenye taarifa", "The statement time matches the message.", "Muda wa taarifa unafanana na ujumbe.", {
    minutesApart: Math.round(gap),
  });
}

/**
 * Turn a payment's parsed date and time into an instant.
 * @param fields - Parsed SMS
 * @returns The instant, or null when the date or time is missing
 */
export function paymentInstant(fields: MpesaFields): Date | null {
  if (!fields.date) return null;
  const day = parseKenyaDate(fields.date);
  if (!day) return null;
  return parseKenyaDateTime(day, fields.time);
}

function result(
  id: CheckResult["id"],
  status: CheckResult["status"],
  titleEn: string,
  titleSw: string,
  plainEn: string,
  plainSw: string,
  evidence: CheckResult["evidence"],
): CheckResult {
  return { id, status, titleEn, titleSw, plainEn, plainSw, evidence };
}
