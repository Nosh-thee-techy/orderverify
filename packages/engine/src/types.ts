/**
 * packages/engine/src/types.ts
 * Shared types for the verification engine. The verdict is one of three words
 * and is produced only by deterministic checks, never by a language model.
 */

/** How a single check finished. `skip` means we did not have the evidence to judge. */
export type CheckStatus = "pass" | "warn" | "fail" | "skip";

/** What the seller should do. Any fail forces HOLD. Warnings force REVIEW. */
export type Verdict = "RELEASE" | "REVIEW" | "HOLD";

/**
 * How strong the evidence was.
 * TEXT_ONLY never earns a solid "verified" badge.
 * STATEMENT_VERIFIED means the receipt was looked up on an uploaded statement.
 */
export type EvidenceTier = "TEXT_ONLY" | "STATEMENT_VERIFIED";

export type CheckId =
  | "FORMAT"
  | "CODE_DATE"
  | "SENDER"
  | "BALANCE_LOCKED"
  | "DUPLICATE_CODE"
  | "AMOUNT"
  | "NAME"
  | "TIMESTAMP"
  | "MATCH_FOUND"
  | "STATEMENT_FOUND"
  | "STATEMENT_AMOUNT"
  | "STATEMENT_TIME";

/** One check on one order. Titles and explanations are ready for the UI in both languages. */
export interface CheckResult {
  id: CheckId;
  status: CheckStatus;
  titleEn: string;
  titleSw: string;
  /** One sentence, non-accusatory. */
  plainEn: string;
  plainSw: string;
  evidence: Record<string, string | number | null>;
}

export interface OrderVerdict {
  orderId: string;
  verdict: Verdict;
  tier: EvidenceTier;
  headlineEn: string;
  headlineSw: string;
  matchedPaymentId: string | null;
  checks: CheckResult[];
  amountPaidKes: number | null;
  amountExpectedKes: number | null;
}

export interface BatchReport {
  reportId: string;
  batchId: string;
  engineVersion: string;
  createdAt: string;
  tier: EvidenceTier;
  counts: { release: number; review: number; hold: number };
  /** Sum of expected amounts (or paid, if expected is unknown) for HOLD orders. */
  moneyHeldKes: number;
  orders: OrderVerdict[];
  unmatchedPayments: { paymentId: string; code: string | null; amountKes: number | null }[];
}

export interface OrderItem {
  name: string;
  qty: number;
  unitPriceKes?: number | null;
}

export interface OrderInput {
  orderId: string;
  customerName: string;
  items: OrderItem[];
  expectedAmountKes: number | null;
  orderedAt: string;
  claimedCode: string | null;
}

export interface PaymentInput {
  paymentId: string;
  rawText: string;
  senderLabel: string | null;
}

export interface StatementRowInput {
  receiptNo: string;
  completedAt: string;
  details: string;
  status: string;
  paidInKes: number | null;
  withdrawnKes: number | null;
}

export interface PriorCode {
  code: string;
  orderRef: string;
  seenAt: string;
}

export interface VerifyBatchInput {
  batchId: string;
  orders: OrderInput[];
  payments: PaymentInput[];
  statementRows: StatementRowInput[] | null;
  priorCodes: PriorCode[];
}

/** Fields pulled out of one M-Pesa SMS. Missing pieces stay null; we never throw. */
export interface MpesaFields {
  code: string | null;
  amountKes: number | null;
  senderName: string | null;
  phone: string | null;
  date: string | null;
  time: string | null;
  balanceText: string | null;
  hasConfirmedWord: boolean;
}

export interface MpesaParseResult {
  ok: boolean;
  fields: MpesaFields;
  missing: string[];
}

export interface ChatMessage {
  at: Date;
  from: string;
  text: string;
}

export interface StatementRow {
  receiptNo: string;
  completedAt: Date | null;
  details: string;
  status: string;
  paidInKes: number | null;
  withdrawnKes: number | null;
}
