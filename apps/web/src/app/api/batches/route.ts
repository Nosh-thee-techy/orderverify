/**
 * apps/web/src/app/api/batches/route.ts
 * Creates a batch from the orders the seller confirmed, and lists recent batches.
 */
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseMpesaMessage, parseStatement, redactPhones, splitMpesaMessages } from "@orderverify/engine";
import { sellerOrLimit, readJson } from "@/server/api";
import { getDb } from "@/server/db/client";
import { batches, orders, paymentEvidence, reports, statementRows } from "@/server/db/schema";
import { phonePrivacy } from "@/server/session";

const orderSchema = z.object({
  customerName: z.string().min(1).max(120),
  items: z.array(z.object({
    name: z.string().min(1).max(200),
    qty: z.number().int().positive().max(1000),
    unitPriceKes: z.number().nullable().optional(),
  })).min(1).max(20),
  expectedAmountKes: z.number().int().nonnegative().nullable(),
  orderedAt: z.string(),
  claimedCode: z.string().max(20).nullable(),
  chatExcerpt: z.string().max(2000).optional(),
  phone: z.string().max(20).optional(),
});

const bodySchema = z.object({
  orders: z.array(orderSchema).min(1).max(50),
  paymentsText: z.string().max(1_000_000).default(""),
  payments: z.array(z.object({ rawText: z.string().max(4000), senderLabel: z.string().max(80).nullable() })).max(80).optional(),
  statementCsv: z.string().max(2_000_000).nullable(),
});

/** List recent batches for the Today screen. */
export async function GET() {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const db = getDb();
  const rows = await db.select().from(batches).where(eq(batches.sellerId, gate.seller.id)).orderBy(desc(batches.createdAt)).limit(20);
  const reportRows = rows.length
    ? await db.select().from(reports)
    : [];
  return NextResponse.json({
    batches: rows.map((batch) => {
      const report = reportRows.find((item) => item.batchId === batch.id)?.report as { counts?: { release: number; review: number; hold: number }; moneyHeldKes?: number } | undefined;
      return {
        id: batch.id,
        status: batch.status,
        evidenceTier: batch.evidenceTier,
        createdAt: batch.createdAt.toISOString(),
        counts: report?.counts ?? { release: 0, review: 0, hold: 0 },
        moneyHeldKes: report?.moneyHeldKes ?? 0,
      };
    }),
  });
}

/** Store a batch. Phone numbers are hashed and then dropped. */
export async function POST(request: Request) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const body = await readJson(request, 3_000_000);
  if ("response" in body) return body.response;
  const parsed = bodySchema.safeParse(body.json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const messages = parsed.data.payments ?? splitMpesaMessages(parsed.data.paymentsText).map((rawText) => ({ rawText, senderLabel: null as string | null }));
  const statement = parsed.data.statementCsv ? parseStatement(parsed.data.statementCsv) : [];
  const tier = statement.length > 0 ? "STATEMENT_VERIFIED" : "TEXT_ONLY";
  const db = getDb();
  const [batch] = await db
    .insert(batches)
    .values({ sellerId: gate.seller.id, status: "ready", evidenceTier: tier })
    .returning();
  if (!batch) return NextResponse.json({ error: "insert_failed" }, { status: 500 });

  await db.insert(orders).values(
    parsed.data.orders.map((order) => {
      const phone = phonePrivacy(order.phone);
      return {
        batchId: batch.id,
        customerName: order.customerName,
        customerPhoneHash: phone.hash,
        customerPhoneLast3: phone.last3,
        items: order.items,
        expectedAmountKes: order.expectedAmountKes,
        orderedAt: new Date(order.orderedAt),
        claimedCode: order.claimedCode,
        chatExcerpt: redactPhones(order.chatExcerpt ?? ""),
      };
    }),
  );
  if (messages.length) {
    await db.insert(paymentEvidence).values(
      messages.map((item) => ({
        batchId: batch.id,
        rawText: item.rawText,
        parsed: parseMpesaMessage(item.rawText),
        senderLabel: item.senderLabel,
      })),
    );
  }
  if (statement.length) {
    await db.insert(statementRows).values(
      statement.map((row) => ({
        batchId: batch.id,
        receiptNo: row.receiptNo,
        completedAt: row.completedAt,
        details: row.details,
        status: row.status,
        paidInKes: row.paidInKes === null ? null : String(row.paidInKes),
        withdrawnKes: row.withdrawnKes === null ? null : String(row.withdrawnKes),
      })),
    );
  }
  return NextResponse.json({ id: batch.id, evidenceTier: tier, orders: parsed.data.orders.length, payments: messages.length });
}
