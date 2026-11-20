/**
 * packages/engine/src/parseWhatsApp.ts
 * Reads a WhatsApp chat export. Supports the two layouts sellers actually send:
 *   12/11/2026, 14:02 - Name: message
 *   [12/11/26, 2:02:11 PM] Name: message
 * Lines without a timestamp continue the previous message. System lines are dropped.
 * Phone numbers inside messages are redacted before the text leaves this function.
 */
import { parseKenyaDate, parseKenyaDateTime } from "./dates.js";
import { redactPhones } from "./redact.js";
import { ChatMessage } from "./types.js";

const SYSTEM_HINTS = [
  "messages and calls are end-to-end encrypted",
  "end-to-end encrypted",
  "you deleted this message",
  "this message was deleted",
  "changed the subject",
  "changed this group's icon",
  "added",
  "left",
  "created group",
  "missed voice call",
  "missed video call",
  "security code",
  "waiting for this message",
];

/**
 * Parse a WhatsApp export into messages.
 * @param text - The exported .txt contents. Treated as untrusted.
 * @returns Messages in order, with phones already redacted. Times are Africa/Nairobi.
 */
export function parseWhatsAppExport(text: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    const header = matchHeader(line);
    if (!header) {
      const last = messages[messages.length - 1];
      if (last && line.trim()) {
        last.text = `${last.text}\n${redactPhones(line.trim())}`;
      }
      continue;
    }
    if (isSystem(header.rest)) continue;
    const speaker = splitSpeaker(header.rest);
    if (!speaker) continue;
    const date = parseKenyaDate(header.date);
    const at = date ? parseKenyaDateTime(date, header.time) : null;
    if (!at) continue;
    messages.push({
      at,
      from: speaker.name.trim(),
      text: redactPhones(speaker.body),
    });
  }
  return messages;
}

interface Header {
  date: string;
  time: string;
  rest: string;
}

function matchHeader(line: string): Header | null {
  const bracket = line.match(
    /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?)\]\s*(.*)$/i,
  );
  if (bracket) {
    return { date: bracket[1] ?? "", time: (bracket[2] ?? "").trim(), rest: bracket[3] ?? "" };
  }
  const dash = line.match(
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?)\s+-\s+(.*)$/i,
  );
  if (dash) {
    return { date: dash[1] ?? "", time: (dash[2] ?? "").trim(), rest: dash[3] ?? "" };
  }
  return null;
}

function splitSpeaker(rest: string): { name: string; body: string } | null {
  const match = rest.match(/^([^:]{1,80}):\s([\s\S]*)$/);
  if (!match) return null;
  return { name: match[1] ?? "", body: (match[2] ?? "").trim() };
}

function isSystem(rest: string): boolean {
  const lower = rest.toLowerCase();
  if (!lower.includes(":")) {
    return SYSTEM_HINTS.some((hint) => lower.includes(hint));
  }
  return false;
}
