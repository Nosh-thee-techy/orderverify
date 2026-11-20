/**
 * packages/engine/src/redact.ts
 * Phone numbers are personal data. Strip them before anything is stored as an excerpt
 * or sent to a language model. Transaction codes contain letters, so they are left alone.
 */

const PHONE_PATTERNS = [
  /(?:\+?254|0)7\d{8}/g,
  /(?:\+?254|0)\d{2}\*{2,}\d{2,6}/g,
  /\b2547\d{8}\b/g,
];

/**
 * Replace phone-like numbers with a fixed mask.
 * @param text - Untrusted chat or SMS text
 * @returns The same text with phones replaced by "07XX XXX ###"
 */
export function redactPhones(text: string): string {
  let out = text;
  for (const pattern of PHONE_PATTERNS) {
    out = out.replace(pattern, "07XX XXX ###");
  }
  // Long digit runs that are not already masked (account numbers pasted into chat).
  out = out.replace(/\b\d{11,}\b/g, "###");
  return out;
}

/**
 * Keep only the last three digits of a phone, for a WhatsApp hint that is not the full number.
 * @param phone - Raw or masked phone
 * @returns Three digits, or null when fewer than three digits are present
 */
export function lastThreeDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 3) return null;
  return digits.slice(-3);
}
