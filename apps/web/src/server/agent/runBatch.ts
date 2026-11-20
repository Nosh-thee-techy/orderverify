/**
 * apps/web/src/server/agent/runBatch.ts
 * Drives one batch: spend-cap check, paid verification call, stored report, timeline events.
 * The verdict inside the report comes only from the rules engine.
 */
import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import {
  priceKes,
  weekStartNairobi,
  wouldExceedCap,
  type BatchReport,
  type VerifyBatchInput,
} from "@orderverify/engine";
import { getDb } from "../db/client.js";
import {
  agentEvents,
  batches,
  orders,
  paymentEvidence,
  payments,
  reports,
  seenCodes,
  sellers,
  statementRows,
} from "../db/schema.js";
import { draftReply } from "./replies.js";
import { explorerUrl, fetchWithPayment, isBypassEnabled, readSettlement } from "./x402Client.js";

export interface RunResult {
  ok: boolean;
  status: string;
  error?: string;
  message?: string;
}

const running = new Set<string>();

/**
 * Run (or resume) a batch. Safe to call twice: a second call while the first is in
 * flight does nothing, so React's strict mode cannot pay twice.
 * @param batchId - Batch to verify
 * @param sellerId - Owner. A batch for someone else is rejected.
 * @returns A status the UI can turn into a banner or the results screen
 */
export async function runBatch(batchId: string, sellerId: string): Promise<RunResult> {
  if (running.has(batchId)) return { ok: true, status: "paying" };
  running.add(batchId);
  try {
    return await runBatchOnce(batchId, sellerId);
  } finally {
    running.delete(batchId);
  }
}

async function runBatchOnce(batchId: string, sellerId: string): Promise<RunResult> {
  const db = getDb();
  const batchRows = await db.select().from(batches).where(eq(batches.id, batchId)).limit(1);
  const batch = batchRows[0];
  if (!batch || batch.sellerId !== sellerId) return { ok: false, status: "error", error: "not_found" };
  if (batch.status === "done") return { ok: true, status: "done" };

  const orderRows = await db.select().from(orders).where(eq(orders.batchId, batchId));
  const evidence = await db.select().from(paymentEvidence).where(eq(paymentEvidence.batchId, batchId));
  const statements = await db.select().from(statementRows).where(eq(statementRows.batchId, batchId));
  await emit(batchId, "parsed", `Read ${orderRows.length} orders and ${evidence.length} payment messages.`);

  const priceUsd = Number(process.env.PRICE_USD ?? "0.01");
  const kesPerUsd = Number(process.env.KES_PER_USD ?? "129");
  const gate = await reserveSpend(sellerId, batchId, priceUsd, kesPerUsd);
  if (!gate.ok) {
    await db
      .update(batches)
      .set({ status: gate.status, errorCode: gate.error })
      .where(eq(batches.id, batchId));
    await emit(batchId, gate.event, gate.message, { capKes: gate.capKes ?? null });
    return { ok: false, status: gate.status, error: gate.error, message: gate.message };
  }

  await db.update(batches).set({ status: "paying" }).where(eq(batches.id, batchId));
  const prior = await db.select().from(seenCodes).where(eq(seenCodes.sellerId, sellerId));
  const input: VerifyBatchInput = {
    batchId,
    orders: orderRows.map((order) => ({
      orderId: order.id,
      customerName: order.customerName,
      items: order.items as VerifyBatchInput["orders"][number]["items"],
      expectedAmountKes: order.expectedAmountKes,
      orderedAt: order.orderedAt.toISOString(),
      claimedCode: order.claimedCode,
    })),
    payments: evidence.map((item) => ({
      paymentId: item.id,
      rawText: item.rawText,
      senderLabel: item.senderLabel,
    })),
    statementRows:
      statements.length === 0
        ? null
        : statements.map((row) => ({
            receiptNo: row.receiptNo,
            completedAt: row.completedAt?.toISOString() ?? "",
            details: row.details,
            status: row.status,
            paidInKes: row.paidInKes === null ? null : Number(row.paidInKes),
            withdrawnKes: row.withdrawnKes === null ? null : Number(row.withdrawnKes),
          })),
    priorCodes: prior.map((row) => ({
      code: row.code,
      orderRef: row.firstOrderId?.slice(0, 8) ?? "earlier",
      seenAt: row.firstSeenAt.toISOString(),
    })),
  };

  try {
    await emit(batchId, "requested", "Asked the verification service to check this batch.");
    const report = await callVerify(batch.id, batch.idempotencyKey, input);
    await db.insert(reports).values({
      batchId,
      engineVersion: report.engineVersion,
      report,
    });
    const held = report.orders.filter((order) => order.verdict === "HOLD");
    const heldMoney = report.moneyHeldKes;
    await emit(batchId, "report_received", "Report delivered.");
    await emit(batchId, "held", `${held.length} orders held, KES ${heldMoney.toLocaleString("en-KE")} at risk.`);
    await writeDrafts(batchId, report);
    await db
      .update(batches)
      .set({ status: "done", evidenceTier: report.tier, completedAt: new Date(), errorCode: null })
      .where(eq(batches.id, batchId));
    return { ok: true, status: "done" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The check could not finish.";
    await refund(sellerId, gate.paymentId, priceUsd);
    await db.update(batches).set({ status: "error", errorCode: "verify_failed" }).where(eq(batches.id, batchId));
    await emit(batchId, "error", message);
    return { ok: false, status: "error", error: "verify_failed", message };
  }
}

async function callVerify(batchId: string, idempotencyKey: string, input: VerifyBatchInput): Promise<BatchReport> {
  const url = `${process.env.VERIFY_API_URL ?? "http://localhost:4021"}/v1/verify-batch`;
  const init: RequestInit = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(input),
  };

  if (isBypassEnabled()) {
    await emit(batchId, "payment_required", "BYPASS: not a real payment. The check is running without Stellar.");
    const response = await fetch(url, init);
    if (!response.ok) throw new Error(await explain(response));
    await markPayment(batchId, { status: "bypassed", txHash: null, payer: null, network: null, raw: { bypass: true } });
    return (await response.json()) as BatchReport;
  }

  // An unpaid probe makes the 402 visible. The handler does not run, so nothing is cached or charged.
  const probe = await fetch(url, init);
  if (probe.status === 402) {
    await emit(batchId, "payment_required", "Payment required. The service asked for 0.01 USDC.");
  }
  await probe.arrayBuffer().catch(() => undefined);
  await emit(batchId, "signed", "Signed the Stellar payment.");

  let lastError = "The verification service did not answer.";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetchWithPayment()(url, init);
      if (response.status >= 500 && attempt < 2) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      if (!response.ok) {
        lastError = await explain(response);
        if (attempt < 2 && response.status !== 402) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        throw new Error(lastError);
      }
      const settlement = readSettlement(response);
      const txHash = settlement?.txHash ?? null;
      await markPayment(batchId, {
        status: settlement?.success === false ? "failed" : "settled",
        txHash,
        payer: settlement?.payer ?? null,
        network: settlement?.network ?? null,
        raw: settlement?.raw ?? null,
      });
      if (settlement?.success === false) throw new Error("The payment did not settle.");
      const link = explorerUrl(txHash);
      await emit(batchId, "settled", txHash ? `Paid. Transaction ${shortHash(txHash)}.` : "Paid.", {
        txHash,
        explorer: link,
        amountUsd: process.env.PRICE_USD ?? "0.01",
        network: "Stellar testnet",
      });
      return (await response.json()) as BatchReport;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
      if (attempt < 2) {
        await sleep(400 * (attempt + 1));
        continue;
      }
    }
  }
  throw new Error(lastError);
}

async function reserveSpend(sellerId: string, batchId: string, priceUsd: number, kesPerUsd: number) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const locked = await tx.select().from(sellers).where(eq(sellers.id, sellerId)).for("update");
    const seller = locked[0];
    if (!seller) return fail("error", "not_found", "error", "Seller not found.");
    const existing = await tx.select().from(payments).where(eq(payments.batchId, batchId));
    const open = existing.find((row) => row.status === "pending" || row.status === "settled" || row.status === "bypassed");
    if (open) return { ok: true as const, paymentId: open.id, status: "paying", error: "", event: "requested" as const, message: "", capKes: seller.weeklyCapKes };

    if (seller.agentPaused) {
      return fail("blocked_cap", "paused", "paused", "The agent is paused. Turn it back on to run a check.");
    }
    const weekStart = weekStartNairobi(new Date());
    const spentRows = await tx
      .select({ total: sql<string>`coalesce(sum(${payments.amountUsd}), 0)` })
      .from(payments)
      .where(
        and(
          eq(payments.sellerId, sellerId),
          gte(payments.createdAt, weekStart),
          inArray(payments.status, ["pending", "settled", "bypassed"]),
        ),
      );
    const spentUsd = Number(spentRows[0]?.total ?? 0);
    if (wouldExceedCap({ spentUsd, priceUsd, capKes: seller.weeklyCapKes, kesPerUsd })) {
      return fail(
        "blocked_cap",
        "cap_reached",
        "cap_reached",
        `Your weekly check budget (KES ${seller.weeklyCapKes}) is used up. Raise it, or wait until Monday.`,
        seller.weeklyCapKes,
      );
    }
    const balance = Number(seller.walletBalanceUsd);
    if (balance + 1e-9 < priceUsd) {
      return fail(
        "blocked_cap",
        "insufficient_balance",
        "error",
        `The demo wallet needs about KES ${priceKes(priceUsd, kesPerUsd)} more. Top-ups here are simulated.`,
      );
    }
    const inserted = await tx
      .insert(payments)
      .values({
        sellerId,
        batchId,
        amountUsd: priceUsd.toFixed(7),
        status: "pending",
        network: process.env.STELLAR_NETWORK ?? "stellar:testnet",
      })
      .returning();
    await tx
      .update(sellers)
      .set({ walletBalanceUsd: (balance - priceUsd).toFixed(7) })
      .where(eq(sellers.id, sellerId));
    const payment = inserted[0];
    if (!payment) return fail("error", "payment_row", "error", "Could not reserve the payment.");
    return { ok: true as const, paymentId: payment.id, status: "paying", error: "", event: "requested" as const, message: "", capKes: seller.weeklyCapKes };
  });
}

function fail(status: string, error: string, event: string, message: string, capKes?: number) {
  return { ok: false as const, status, error, event, message, capKes, paymentId: "" };
}

async function markPayment(
  batchId: string,
  fields: { status: string; txHash: string | null; payer: string | null; network: string | null; raw: unknown },
) {
  const db = getDb();
  await db
    .update(payments)
    .set({
      status: fields.status,
      txHash: fields.txHash,
      payer: fields.payer,
      network: fields.network,
      rawSettlement: fields.raw,
      settledAt: new Date(),
    })
    .where(and(eq(payments.batchId, batchId), eq(payments.status, "pending")));
}

async function refund(sellerId: string, paymentId: string, priceUsd: number) {
  if (!paymentId) return;
  const db = getDb();
  await db.transaction(async (tx) => {
    const current = await tx.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (current[0]?.status !== "pending") return;
    await tx.update(payments).set({ status: "failed", settledAt: new Date() }).where(eq(payments.id, paymentId));
    const seller = await tx.select().from(sellers).where(eq(sellers.id, sellerId)).limit(1);
    if (!seller[0]) return;
    const balance = Number(seller[0].walletBalanceUsd) + priceUsd;
    await tx.update(sellers).set({ walletBalanceUsd: balance.toFixed(7) }).where(eq(sellers.id, sellerId));
  });
}

async function writeDrafts(batchId: string, report: BatchReport) {
  const drafts: Record<string, { en: string; sw: string }> = {};
  for (const order of report.orders) {
    if (order.verdict === "RELEASE") continue;
    const row = await getDb().select().from(orders).where(eq(orders.id, order.orderId)).limit(1);
    const name = row[0]?.customerName ?? "there";
    drafts[order.orderId] = await draftReply(name, order.headlineEn);
  }
  if (Object.keys(drafts).length) {
    await emit(batchId, "report_received", "Drafted replies for the orders that need a look.", { drafts });
  }
}

/**
 * Append one line to the activity timeline.
 * @param batchId - Batch the line belongs to
 * @param kind - Machine name for the stage
 * @param message - Plain sentence for the seller
 * @param data - Optional extra fields such as a transaction hash. No phone numbers.
 */
export async function emit(batchId: string, kind: string, message: string, data?: Record<string, unknown> | null) {
  await getDb().insert(agentEvents).values({ batchId, kind, message, data: data ?? null });
}

async function explain(response: Response): Promise<string> {
  if (response.status === 402) return "Payment was required and did not settle. You have not been charged for a finished check.";
  const text = await response.text();
  return text.slice(0, 300) || `The service answered ${response.status}.`;
}

function shortHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
