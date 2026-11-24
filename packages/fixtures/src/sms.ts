/**
 * packages/fixtures/src/sms.ts
 * One place that writes a synthetic confirmation so the eval set and the demo stay consistent.
 * Includes Jumbe-style and masked-sender layouts Safaricom has been rolling out.
 */

/**
 * Build one synthetic confirmation SMS.
 * @param input - The fields the checks will read back
 * @returns SMS text. Not a real customer's message.
 */
export function buildSms(input: {
  code: string;
  amount: number;
  name: string;
  dateLabel: string;
  time?: string;
  locked?: boolean;
  phone?: string;
}): string {
  const amount = input.amount.toLocaleString("en-KE");
  const balance = input.locked
    ? "New M-PESA balance is Ksh9,000.00 LOCKED"
    : "New M-PESA balance is Ksh9,000.00.";
  return `${input.code} Confirmed. You have received Ksh${amount}.00 from ${input.name} ${input.phone ?? "0712345678"} on ${input.dateLabel} at ${input.time ?? "2:15 PM"}. ${balance}`;
}

/**
 * Jumbe-style proof: code, amount, and time without a full payer name or balance.
 * NAME must skip gracefully — this is intentional privacy, not a forgery.
 * @param input - Code, amount, and date
 * @returns Synthetic Jumbe confirmation text
 */
export function buildJumbeSms(input: {
  code: string;
  amount: number;
  dateLabel: string;
  time?: string;
}): string {
  const amount = input.amount.toLocaleString("en-KE");
  return `${input.code} Confirmed. You have received Ksh${amount}.00 on ${input.dateLabel} at ${input.time ?? "2:15 PM"}. Jumbe payment confirmation.`;
}

/**
 * Partial phone masking (Safaricom style since early 2026). Name may still be present.
 * @param input - Code, amount, name, masked phone
 * @returns Synthetic SMS with a masked MSISDN
 */
export function buildMaskedSenderSms(input: {
  code: string;
  amount: number;
  name: string;
  dateLabel: string;
  time?: string;
  phone?: string;
}): string {
  const amount = input.amount.toLocaleString("en-KE");
  const phone = input.phone ?? "0712***678";
  return `${input.code} Confirmed. You have received Ksh${amount}.00 from ${input.name} ${phone} on ${input.dateLabel} at ${input.time ?? "2:15 PM"}. New M-PESA balance is Ksh9,000.00.`;
}
