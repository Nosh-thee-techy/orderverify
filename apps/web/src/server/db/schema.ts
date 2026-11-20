/**
 * apps/web/src/server/db/schema.ts
 * Drizzle schema for the seller, her batches, and the payment audit trail.
 * Full phone numbers are never stored. Comments here match the SQL migration.
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
  uuid,
} from "drizzle-orm/pg-core";

/** One seller. The demo starts with Akinyi and is shaped so more sellers can be added later. */
export const sellers = pgTable("sellers", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Name shown in the greeting. */
  displayName: text("display_name").notNull(),
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
  sellerId: uuid("seller_id")
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

/** An order extracted from chat. The seller can edit it before the check runs. */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "cascade" }),
  customerName: text("customer_name").notNull(),
  /** Salted hash. The full number is never stored. */
  customerPhoneHash: text("customer_phone_hash"),
  customerPhoneLast3: text("customer_phone_last3"),
  /** [{ name, qty, unitPriceKes? }] */
  items: jsonb("items").notNull(),
  expectedAmountKes: integer("expected_amount_kes"),
  orderedAt: timestamp("ordered_at", { withTimezone: true }).notNull(),
  claimedCode: text("claimed_code"),
  /** Redacted excerpt for the detail view. Blanked after the retention window. */
  chatExcerpt: text("chat_excerpt").notNull().default(""),
  /** null | released | held | more_info */
  sellerDecision: text("seller_decision"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
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

/** Every transaction code this seller has already accepted. Catches reuse on a later day. */
export const seenCodes = pgTable(
  "seen_codes",
  {
    sellerId: uuid("seller_id")
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
  sellerId: uuid("seller_id")
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

/** Used by raw SQL fragments that drizzle's sql tag needs in scope for migrations helpers. */
export const now = sql`now()`;
