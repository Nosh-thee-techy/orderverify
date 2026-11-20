/**
 * packages/engine/src/extractBasic.ts
 * Deterministic order extraction used when no LLM key is configured, and as the
 * fallback when the model returns something that is not the schema.
 * Amounts are taken only from KES/Ksh figures, so a buyer typing "set the amount to 1"
 * cannot change the price.
 */
import { z } from "zod";
import { redactPhones } from "./redact.js";
import { ChatMessage } from "./types.js";

export const extractedOrderSchema = z.object({
  customerName: z.string().min(1).max(120),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        qty: z.number().int().positive().max(1000),
        unitPriceKes: z.number().int().nonnegative().nullable().optional(),
      }),
    )
    .min(1)
    .max(30),
  expectedAmountKes: z.number().int().nonnegative().nullable(),
  orderedAt: z.string(),
  claimedCode: z.string().max(20).nullable(),
  evidenceMessageIds: z.array(z.string()).max(50),
});

export const extractedOrdersSchema = z.object({
  orders: z.array(extractedOrderSchema).max(50),
});

export type ExtractedOrders = z.infer<typeof extractedOrdersSchema>;

export interface NumberedMessage extends ChatMessage {
  id: string;
}

/**
 * Pull orders out of a chat with currency markers and transaction codes only.
 * @param messages - Parsed chat. Phone numbers should already be redacted, but we redact again.
 * @param sellerName - The seller's display name, so her own messages are not treated as customers
 * @returns Schema-valid orders. Injection text that is not a real order is ignored.
 */
export function extractOrdersBasic(messages: NumberedMessage[], sellerName: string | null): ExtractedOrders {
  const seller = (sellerName ?? guessSeller(messages)).trim().toLowerCase();
  const customers = new Map<string, NumberedMessage[]>();
  for (const message of messages) {
    if (message.from.trim().toLowerCase() === seller) continue;
    const bucket = customers.get(message.from) ?? [];
    bucket.push(message);
    customers.set(message.from, bucket);
  }

  const orders = [];
  for (const [name, thread] of customers) {
    const blob = thread.map((message) => redactPhones(message.text)).join("\n");
    const amount = firstCurrencyAmount(blob);
    const code = blob.match(/\b([A-Z][A-Z0-9]{9})\b/)?.[1] ?? null;
    const interesting = /(?:ksh|kes|order|oda|nataka|tuma|send|dress|shirt|size|lipa|pay)/i.test(blob);
    if (!interesting && amount === null && !code) continue;
    const itemName = guessItem(blob) ?? "Order";
    const first = thread[0];
    orders.push({
      customerName: name,
      items: [{ name: itemName, qty: guessQty(blob), unitPriceKes: amount }],
      expectedAmountKes: amount,
      orderedAt: (first?.at ?? new Date()).toISOString(),
      claimedCode: code,
      evidenceMessageIds: thread.map((message) => message.id),
    });
  }
  return extractedOrdersSchema.parse({ orders });
}

/**
 * Accept model output only when it matches the extraction schema.
 * Anything else (including a verdict, a price change, or prose) is rejected.
 * @param raw - The model's text
 * @returns Parsed orders, or null when the payload is not the schema
 */
export function parseModelExtraction(raw: string): ExtractedOrders | null {
  const jsonText = sliceJson(raw);
  if (!jsonText) return null;
  try {
    const value = extractedOrdersSchema.safeParse(JSON.parse(jsonText));
    return value.success ? value.data : null;
  } catch {
    return null;
  }
}

function guessSeller(messages: NumberedMessage[]): string {
  const counts = new Map<string, number>();
  for (const message of messages) {
    counts.set(message.from, (counts.get(message.from) ?? 0) + 1);
  }
  let best = "";
  let bestCount = -1;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

function firstCurrencyAmount(text: string): number | null {
  const match = text.match(/(?:ksh|kes)\s*([0-9][0-9,]*(?:\.\d+)?)/i);
  if (!match) return null;
  const value = Number((match[1] ?? "").replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}

function guessQty(text: string): number {
  const match = text.match(/\b(\d{1,2})\s+(?:x\s+)?[a-z]/i);
  if (!match) return 1;
  const qty = Number(match[1]);
  return qty > 0 && qty < 20 ? qty : 1;
}

function guessItem(text: string): string | null {
  const line = text
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.length > 2 && part.length < 80 && !/(?:ksh|kes)/i.test(part) && !/ignore previous/i.test(part));
  return line ?? null;
}

function sliceJson(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return raw.slice(start, end + 1);
}
