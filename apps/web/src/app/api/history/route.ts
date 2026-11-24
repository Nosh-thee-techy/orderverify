/**
 * apps/web/src/app/api/history/route.ts
 * Paginated history for the signed-in seller. Search hashes the query and also
 * does a decrypted substring match limited to this seller's rows.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { decryptOrEmpty, hashCode, hashName, hashPhone } from "@/server/crypto";
import { readJson, sellerOrLimit } from "@/server/api";
import { getDb } from "@/server/db/client";
import { batches, mpesaRecords, orders, reports } from "@/server/db/schema";
import { revealOrder } from "@/server/reveal";

const PAGE = 25;

/**
 * GET ?tab=orders|mpesa&q=&verdict=&source=&page=
 */
export async function GET(request: Request) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") === "mpesa" ? "mpesa" : "orders";
  const q = (url.searchParams.get("q") ?? "").trim();
  const verdict = url.searchParams.get("verdict") ?? "";
  const source = url.searchParams.get("source") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const db = getDb();
  const sellerId = gate.seller.id;

  if (tab === "mpesa") {
    const rows = await db.select().from(mpesaRecords).where(eq(mpesaRecords.sellerId, sellerId)).orderBy(desc(mpesaRecords.createdAt));
    const nameH = q ? hashName(q) : null;
    const codeH = q ? hashCode(q) : null;
    const phoneH = q ? hashPhone(q) : null;
    const needle = q.toLowerCase();
    const filtered = rows.filter((row) => {
      if (!q) return true;
      if (codeH && row.transCodeHash === codeH) return true;
      if (nameH && row.payerNameHash === nameH) return true;
      if (phoneH && row.payerPhoneHash === phoneH) return true;
      const code = decryptOrEmpty(row.transCodeEnc).toLowerCase();
      const name = decryptOrEmpty(row.payerNameEnc).toLowerCase();
      const phone = decryptOrEmpty(row.payerPhoneEnc).toLowerCase();
      return code.includes(needle) || name.includes(needle) || phone.includes(needle);
    });
    const slice = filtered.slice((page - 1) * PAGE, page * PAGE);
    return NextResponse.json({
      tab,
      page,
      pageSize: PAGE,
      total: filtered.length,
      records: slice.map((row) => ({
        id: row.id,
        batchId: row.batchId,
        code: decryptOrEmpty(row.transCodeEnc),
        amountKes: row.amountKes,
        payerName: decryptOrEmpty(row.payerNameEnc),
        receivedAt: row.receivedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  }

  const orderRows = await db.select().from(orders).where(eq(orders.sellerId, sellerId)).orderBy(desc(orders.createdAt));
  const batchRows = await db.select().from(batches).where(eq(batches.sellerId, sellerId));
  const batchIds = batchRows.map((row) => row.id);
  const reportRows = batchIds.length ? await db.select().from(reports).where(inArray(reports.batchId, batchIds)) : [];
  const nameH = q ? hashName(q) : null;
  const codeH = q ? hashCode(q) : null;
  const phoneH = q ? hashPhone(q) : null;
  const needle = q.toLowerCase();

  const revealed = orderRows.map(revealOrder).filter((order) => {
    if (verdict && order.verdict !== verdict) return false;
    if (source && order.source !== source) return false;
    if (!q) return true;
    if (nameH && orderRows.find((row) => row.id === order.id)?.buyerNameHash === nameH) return true;
    if (codeH && orderRows.find((row) => row.id === order.id)?.claimedCodeHash === codeH) return true;
    if (phoneH && orderRows.find((row) => row.id === order.id)?.buyerPhoneHash === phoneH) return true;
    return (
      order.customerName.toLowerCase().includes(needle) ||
      (order.claimedCode ?? "").toLowerCase().includes(needle) ||
      order.phone.toLowerCase().includes(needle)
    );
  });

  const byBatch = new Map<string, typeof revealed>();
  for (const order of revealed) {
    const list = byBatch.get(order.batchId) ?? [];
    list.push(order);
    byBatch.set(order.batchId, list);
  }
  const batchesOut = [...byBatch.entries()]
    .map(([batchId, list]) => {
      const batch = batchRows.find((row) => row.id === batchId);
      const report = reportRows.find((row) => row.batchId === batchId)?.report as { counts?: { hold: number; review: number; release: number } } | undefined;
      return {
        id: batchId,
        createdAt: batch?.createdAt.toISOString() ?? list[0]?.createdAt.toISOString(),
        status: batch?.status ?? "draft",
        source: list[0]?.source ?? "upload",
        counts: {
          hold: list.filter((item) => item.verdict === "HOLD").length,
          review: list.filter((item) => item.verdict === "REVIEW").length,
          release: list.filter((item) => item.verdict === "RELEASE").length,
          total: list.length,
        },
        reportCounts: report?.counts,
        hasReport: Boolean(report),
        preview: list.slice(0, 3).map((item) => ({
          id: item.id,
          customerName: item.customerName,
          claimedCode: item.claimedCode,
          verdict: item.verdict,
          tier: item.tier,
        })),
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  const slice = batchesOut.slice((page - 1) * PAGE, page * PAGE);
  return NextResponse.json({
    tab,
    page,
    pageSize: PAGE,
    total: batchesOut.length,
    batches: slice,
  });
}

const deleteSchema = z
  .object({
    all: z.boolean().optional(),
    batchIds: z.array(z.string().uuid()).max(50).optional(),
  })
  .refine((body) => body.all === true || (body.batchIds && body.batchIds.length > 0), {
    message: "Select at least one report, or delete all.",
  });

/**
 * DELETE { all: true } or { batchIds: string[] }.
 * Only this seller's batches are removed. Cascades to orders, reports, and M-Pesa rows.
 */
export async function DELETE(request: Request) {
  const gate = await sellerOrLimit();
  if ("response" in gate) return gate.response;
  const body = await readJson(request, 20_000);
  if ("response" in body) return body.response;
  const parsed = deleteSchema.safeParse(body.json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const db = getDb();
  const sellerId = gate.seller.id;
  if (parsed.data.all) {
    const removed = await db.delete(batches).where(eq(batches.sellerId, sellerId)).returning({ id: batches.id });
    return NextResponse.json({ deleted: removed.length, all: true });
  }

  const ids = [...new Set(parsed.data.batchIds ?? [])];
  const owned = await db
    .select({ id: batches.id })
    .from(batches)
    .where(and(eq(batches.sellerId, sellerId), inArray(batches.id, ids)));
  const ownedIds = owned.map((row) => row.id);
  if (ownedIds.length === 0) return NextResponse.json({ deleted: 0 });
  await db.delete(batches).where(and(eq(batches.sellerId, sellerId), inArray(batches.id, ownedIds)));
  return NextResponse.json({ deleted: ownedIds.length, all: false });
}
