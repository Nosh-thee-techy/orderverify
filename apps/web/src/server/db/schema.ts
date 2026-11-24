/**
 * apps/web/src/server/db/schema.ts
 * Drizzle schema for the seller, her batches, and the payment audit trail.
 * Seller ids are Clerk user ids. Names, phones, and codes are stored encrypted.
 * Comments here match the SQL migrations.
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** One seller. Primary key is the Clerk user id (text), not a generated uuid. */
export const sellers = pgTable("sellers", {
  id: text("id").primaryKey(),
  /** Name shown in the greeting. */
  displayName: text("display_name").notNull(),
  /** Primary email from Clerk. Empty string until the first profile refresh. */
  email: text("email").notNull().default(""),
  /** Optional WhatsApp number, encrypted the same way as order phones. */
  whatsappNumberEnc: text("whatsapp_number_enc"),
  /** 'en' or 'sw'. */
  language: text("language").notNull().default("en"),
  /** Weekly ceiling for paid checks, in Kenyan shillings. */
  weeklyCapKes: integer("weekly_cap_kes").notNull().default(50),
  /** When true the agent must not pay. */
  agentPaused: boolean("agent_paused").notNull().default(false),
  /** SIMULATED top-up credit. Not the on-chain USDC balance. */
  walletBalanceUsd: numeric("wallet_balance_usd", { precision: 12, scale: 7 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One "check my orders" run. */
export const batches = pgTable("batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  sellerId: text("seller_id")
    .notNull()
    .references(() => sellers.id, { onDelete: "cascade" }),
  /** draft | ready | paying | verifying | done | blocked_cap | error */
  status: text("status").notNull().default("draft"),
  /** TEXT_ONLY or STATEMENT_VERIFIED. Set from what the seller uploaded, then confirmed by the report. */
  evidenceTier: text("evidence_tier").notNull().default("TEXT_ONLY"),
  idempotencyKey: uuid("idempotency_key").notNull().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorCode: text("error_code"),
});

/** An order extracted from chat. PII lives in *_enc columns; plaintext name/code stay empty. */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "cascade" }),
  sellerId: text("seller_id")
    .notNull()
    .references(() => sellers.id, { onDelete: "cascade" }),
  /** whatsapp | tiktok | upload */
  source: text("source").notNull().default("upload"),
  /** Kept empty on insert. Decrypt buyer_name_enc for the owner. */
  customerName: text("customer_name").notNull().default(""),
  /** Legacy last-3 helper hash. New matching uses buyer_phone_hash. */
  customerPhoneHash: text("customer_phone_hash"),
  customerPhoneLast3: text("customer_phone_last3"),
  buyerNameEnc: text("buyer_name_enc"),
  buyerNameHash: text("buyer_name_hash"),
  buyerPhoneEnc: text("buyer_phone_enc"),
  buyerPhoneHash: text("buyer_phone_hash"),
  /** [{ name, qty, unitPriceKes? }] */
  items: jsonb("items").notNull(),
  itemSummary: text("item_summary").notNull().default(""),
  expectedAmountKes: integer("expected_amount_kes"),
  claimedAmountKes: integer("claimed_amount_kes"),
  orderedAt: timestamp("ordered_at", { withTimezone: true }).notNull(),
  /** Kept empty on insert. Decrypt claimed_code_enc for the owner. */
  claimedCode: text("claimed_code"),
  claimedCodeEnc: text("claimed_code_enc"),
  claimedCodeHash: text("claimed_code_hash"),
  /** Redacted excerpt for the detail view. Blanked after the retention window. */
  chatExcerpt: text("chat_excerpt").notNull().default(""),
  /** Engine verdict after the paid check. */
  engineVerdict: text("engine_verdict"),
  /** Effective verdict shown to the seller (may be raised by cross-shop). */
  verdict: text("verdict"),
  tier: text("tier"),
  reasons: jsonb("reasons").notNull().default(sql`'[]'::jsonb`),
  dismissedCrossFlag: boolean("dismissed_cross_flag").notNull().default(false),
  /** null | released | held | more_info */
  sellerDecision: text("seller_decision"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Raw M-Pesa messages the seller pasted, plus the parsed fields. */
export const paymentEvidence = pgTable("payment_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "cascade" }),
  rawText: text("raw_text").notNull(),
  parsed: jsonb("parsed"),
  senderLabel: text("sender_label"),
});

/** Rows from an uploaded M-Pesa statement. Stronger evidence than the SMS text. */
export const statementRows = pgTable("statement_rows", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "cascade" }),
  receiptNo: text("receipt_no").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  details: text("details").notNull().default(""),
  status: text("status").notNull().default(""),
  paidInKes: numeric("paid_in_kes"),
  withdrawnKes: numeric("withdrawn_kes"),
});

/** Encrypted M-Pesa statement lines, hashed so other shops can match a code without seeing it. */
export const mpesaRecords = pgTable(
  "mpesa_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    sellerId: text("seller_id")
      .notNull()
      .references(() => sellers.id, { onDelete: "cascade" }),
    transCodeEnc: text("trans_code_enc").notNull(),
    transCodeHash: text("trans_code_hash").notNull(),
    amountKes: integer("amount_kes"),
    payerNameEnc: text("payer_name_enc"),
    payerNameHash: text("payer_name_hash"),
    payerPhoneEnc: text("payer_phone_enc"),
    payerPhoneHash: text("payer_phone_hash"),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeSeller: uniqueIndex("mpesa_records_code_seller").on(table.transCodeHash, table.sellerId),
  }),
);

/** Every transaction code this seller has already accepted. Catches reuse on a later day. */
export const seenCodes = pgTable(
  "seen_codes",
  {
    sellerId: text("seller_id")
      .notNull()
      .references(() => sellers.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    firstOrderId: uuid("first_order_id"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sellerId, table.code] }),
  }),
);

/** The report returned by the paid API, stored as received. */
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "cascade" }),
  engineVersion: text("engine_version").notNull(),
  report: jsonb("report").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every x402 payment attempt. Judges and the seller can inspect this. */
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  sellerId: text("seller_id")
    .notNull()
    .references(() => sellers.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "cascade" }),
  amountUsd: numeric("amount_usd", { precision: 12, scale: 7 }).notNull(),
  /** pending | settled | failed | bypassed */
  status: text("status").notNull(),
  network: text("network"),
  txHash: text("tx_hash"),
  payer: text("payer"),
  payTo: text("pay_to"),
  rawSettlement: jsonb("raw_settlement"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

/** Human-readable timeline for the Agent activity screen. */
export const agentEvents = pgTable("agent_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "cascade" }),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  /** parsed | requested | payment_required | signed | settled | report_received | held | cap_reached | paused | error */
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
});

/** Audit that a seller dismissed a cross-shop flag. The other shop is never named. */
export const crossFlagDismissals = pgTable("cross_flag_dismissals", {
  id: uuid("id").primaryKey().defaultRandom(),
  sellerId: text("seller_id")
    .notNull()
    .references(() => sellers.id, { onDelete: "cascade" }),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Used by raw SQL fragments that drizzle's sql tag needs in scope for migrations helpers. */
export const now = sql`now()`;
