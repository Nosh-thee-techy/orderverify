/**
 * packages/engine/src/schema.ts
 * Zod schema for a verification request. Shared by the web app and verify-api
 * so a client cannot sneak extra fields into the rules engine.
 */
import { z } from "zod";

const orderItemSchema = z.object({
  name: z.string().min(1).max(200),
  qty: z.number().int().positive().max(1000),
  unitPriceKes: z.number().int().nonnegative().nullable().optional(),
});

export const orderInputSchema = z.object({
  orderId: z.string().min(1).max(80),
  customerName: z.string().min(1).max(120),
  items: z.array(orderItemSchema).min(1).max(30),
  expectedAmountKes: z.number().int().nonnegative().nullable(),
  orderedAt: z.string().min(4),
  claimedCode: z.string().max(20).nullable(),
});

export const paymentInputSchema = z.object({
  paymentId: z.string().min(1).max(80),
  rawText: z.string().max(4000),
  senderLabel: z.string().max(80).nullable(),
});

export const statementRowSchema = z.object({
  receiptNo: z.string().max(40),
  completedAt: z.string(),
  details: z.string().max(500),
  status: z.string().max(40),
  paidInKes: z.number().nullable(),
  withdrawnKes: z.number().nullable(),
});

export const priorCodeSchema = z.object({
  code: z.string().max(20),
  orderRef: z.string().max(80),
  seenAt: z.string(),
});

export const verifyBatchInputSchema = z.object({
  batchId: z.string().min(1).max(80),
  // The HTTP handler returns 413 above MAX_ORDERS_PER_BATCH. The schema allows a little
  // headroom so that response stays 413 rather than a generic validation error.
  orders: z.array(orderInputSchema).max(100),
  payments: z.array(paymentInputSchema).max(80),
  statementRows: z.array(statementRowSchema).max(2000).nullable(),
  priorCodes: z.array(priorCodeSchema).max(5000),
});

export type VerifyBatchInputParsed = z.infer<typeof verifyBatchInputSchema>;

/**
 * Parse and validate a verify-batch body.
 * @param input - Untrusted JSON
 * @returns The parsed input, or a thrown ZodError
 */
export function parseVerifyBatchInput(input: unknown): VerifyBatchInputParsed {
  return verifyBatchInputSchema.parse(input);
}
