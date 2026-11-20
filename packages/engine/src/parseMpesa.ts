/**
 * packages/engine/src/parseMpesa.ts
 * Tolerant parser for M-Pesa confirmation SMS text.
 * Wording, masking, and spacing change over time, so this never throws:
 * unreadable input comes back as ok:false with a list of missing fields.
 */
import { MpesaFields, MpesaParseResult } from "./types.js";

const EMPTY: MpesaFields = {
  code: null,
  amountKes: null,
  senderName: null,
  phone: null,
  date: null,
  time: null,
  balanceText: null,
  hasConfirmedWord: false,
};

/**
 * Parse one M-Pesa message.
 * @param raw - The SMS text as pasted by the seller. Treated as untrusted.
 * @returns Parsed fields. `ok` is false when we could not read a code plus an amount or a confirmation.
 */
export function parseMpesaMessage(raw: string): MpesaParseResult {
  const text = (raw ?? "").replace(/\u00a0/g, " ").trim();
  if (!text) return { ok: false, fields: { ...EMPTY }, missing: ["code", "amountKes", "senderName", "date"] };

  const fields: MpesaFields = { ...EMPTY };
  const codeMatch = text.match(/^([A-Za-z0-9]{10})\b/);
  fields.code = codeMatch ? (codeMatch[1] ?? "").toUpperCase() : null;

  fields.hasConfirmedWord = /confirmed/i.test(text) || /received from/i.test(text);

  // The balance clause also contains an amount. Cut it off so we keep the money that was received.
  // The balance sentence often contains a decimal point ("Ksh1,000.00"), so we must not
  // stop at the first dot. LOCKED, when present, is part of that balance claim.
  const balanceStart = text.search(/\b(?:new|available)\b/i);
  const balanceWord = text.search(/\bbalance\b/i);
  if (balanceWord >= 0) {
    const start = balanceStart >= 0 && balanceStart < balanceWord ? balanceStart : Math.max(0, balanceWord - 20);
    fields.balanceText = text.slice(start, Math.min(text.length, balanceWord + 80)).trim();
  }
  if (/locked/i.test(text) && balanceWord >= 0) {
    fields.balanceText = `${fields.balanceText ?? "balance"} LOCKED`;
  }
  const head = balanceWord >= 0 ? text.slice(0, balanceWord) : text;
  const amountMatch = head.match(/(?:ksh|kes)\s*([0-9][0-9,]*(?:\.\d+)?)/i);
  fields.amountKes = amountMatch ? parseKes(amountMatch[1] ?? "") : null;

  const senderMatch = head.match(
    /(?:received\s+from|from)\s+([A-Za-z][A-Za-z .'-]{1,60}?)(?=\s+(?:0\d|\+?\d|on\b)|$)/i,
  );
  fields.senderName = senderMatch ? cleanupName(senderMatch[1] ?? "") : null;

  const phoneMatch = text.match(/(?:\+?254|0)\d[\d*]{6,12}/);
  fields.phone = phoneMatch?.[0] ?? null;

  const dateMatch = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
  fields.date = dateMatch?.[1] ?? null;

  const timeMatch = text.match(/\bat\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?)/i);
  fields.time = timeMatch?.[1]?.replace(/\s+/g, " ").trim() ?? null;

  const missing: string[] = [];
  if (!fields.code) missing.push("code");
  if (fields.amountKes === null) missing.push("amountKes");
  if (!fields.senderName) missing.push("senderName");
  if (!fields.date) missing.push("date");
  if (!fields.time) missing.push("time");

  // A code with an amount, or a code with the word Confirmed, is enough to run the checks.
  const ok = Boolean(fields.code && (fields.amountKes !== null || fields.hasConfirmedWord));
  return { ok, fields, missing };
}

/**
 * Split a paste of several SMS into individual messages.
 * Blank lines separate messages. A new 10-character code at the start of a line does too.
 * @param text - The whole paste box
 * @returns One string per message. Empty input returns an empty list.
 */
export function splitMpesaMessages(text: string): string[] {
  const chunks = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const messages: string[] = [];
  for (const chunk of chunks) {
    let current = "";
    for (const line of chunk.split(/\n/)) {
      const startsNew = /^[A-Za-z0-9]{10}\b/.test(line.trim());
      if (startsNew && current.trim()) {
        messages.push(current.trim());
        current = line;
      } else {
        current = current ? `${current}\n${line}` : line;
      }
    }
    if (current.trim()) messages.push(current.trim());
  }
  return messages;
}

function parseKes(raw: string): number | null {
  const value = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}

function cleanupName(name: string): string | null {
  const cleaned = name.replace(/\s+/g, " ").trim().replace(/[.-]+$/, "").trim();
  if (cleaned.length < 2) return null;
  return cleaned;
}
