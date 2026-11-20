/**
 * packages/fixtures/src/sms.ts
 * One place that writes a synthetic confirmation so the eval set and the demo stay consistent.
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
