/**
 * scripts/system-check.ts
 * Seeds two mock shops and walks the pieces a signed-in seller would hit:
 * engine verdicts, encrypted history, cross-shop raise, select/delete, PDF
 * view-model, and the paid API with payment turned off.
 *
 * Does not charge x402. Does not touch non-mock sellers.
 *
 *   npx tsx scripts/system-check.ts
 *   npx tsx scripts/system-check.ts --clean
 */
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, inArray, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import { parseStatement, verifyBatch, type BatchReport, type OrderInput, type PaymentInput, type StatementRowInput } from "@orderverify/engine";
import { buildDemoScenario } from "@orderverify/fixtures";
import { encrypt, hashCode, hashName, decryptOrEmpty } from "../apps/web/src/server/crypto.ts";
import { batches, mpesaRecords, orders, paymentEvidence, reports, sellers, statementRows } from "../apps/web/src/server/db/schema.ts";
import { clerkDisplayName } from "../apps/web/src/lib/sellerName.ts";
import { buildReportDocument } from "../apps/web/src/lib/reportDocument.ts";
import { applyNetworkHits } from "../apps/web/src/server/network.ts";
import { createApp } from "../services/verify-api/src/app.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: resolve(root, ".env") });

const MOCK_AKINYI = "user_mock_akinyi";
const MOCK_WANJIKU = "user_mock_wanjiku";
const clean = process.argv.includes("--clean");

const failures: string[] = [];

/**
 * Record one check. Failures are printed again at the end.
 *
 * @param name - What was exercised
 * @param ok - Whether it behaved as specified
 * @param detail - Extra context on failure
 */
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    console.log(`  ok    ${name}`);
    return;
  }
  failures.push(name);
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

function loadDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 5 });
  return { sql, db: drizzle(sql, { schema: { sellers, batches, orders, reports, paymentEvidence, statementRows, mpesaRecords } }) };
}

/**
 * Run the engine on Akinyi's sample day, then seed shops and walk history/delete.
 */
async function main(): Promise<void> {
  console.log("\n== 1. Display name (Today banner / header) ==");
  check("full name wins", clerkDisplayName({ fullName: "Jane Wanjiku" }) === "Jane Wanjiku");
  check("empty Clerk payload is blank, not Seller", clerkDisplayName(null) === "");
  check("email prefix when there is no name", clerkDisplayName({ emailAddresses: [{ emailAddress: "akinyi@shop.ke" }] }) === "akinyi");

  console.log("\n== 2. Engine on demo mock (text-only vs statement) ==");
  const demo = buildDemoScenario(new Date());
  const engineOrders: OrderInput[] = demo.orders.map((item) => item.order);
  const enginePayments: PaymentInput[] = demo.orders.flatMap((item) => (item.payment ? [item.payment] : []));
  const now = new Date();
  const nowIso = now.toISOString();
  const parsedStatement = parseStatement(demo.statementCsv);
  const statement = parsedStatement.map((row) => ({
    receiptNo: row.receiptNo,
    completedAt: row.completedAt ? row.completedAt.toISOString() : nowIso,
    details: row.details,
    status: row.status,
    paidInKes: row.paidInKes,
    withdrawnKes: row.withdrawnKes,
  }));
  const textOnly = verifyBatch(
    { batchId: "mock-text", orders: engineOrders, payments: enginePayments, statementRows: null, priorCodes: [] },
    now,
  );
  const withStatement = verifyBatch(
    { batchId: "mock-statement", orders: engineOrders, payments: enginePayments, statementRows: statement, priorCodes: [] },
    now,
  );
  const textReleaseAsVerified = textOnly.orders.some((order) => order.verdict === "RELEASE" && order.tier === "STATEMENT_VERIFIED");
  check("text-only batch is TEXT_ONLY", textOnly.tier === "TEXT_ONLY");
  check("text-only RELEASE is never STATEMENT_VERIFIED", !textReleaseAsVerified);
  check("statement batch is STATEMENT_VERIFIED", withStatement.tier === "STATEMENT_VERIFIED");
  check("demo produces HOLD or REVIEW (risky orders exist)", withStatement.counts.hold + withStatement.counts.review > 0);
  check("demo still has at least one RELEASE", withStatement.counts.release > 0);
  const fabricated = demo.orders.find((item) => item.id === "10-fabricated");
  const fabricatedVerdict = withStatement.orders.find((order) => order.orderId === fabricated?.order.orderId);
  check("fabricated code is held once the statement is present", fabricatedVerdict?.verdict === "HOLD");

  const doc = buildReportDocument(
    withStatement,
    engineOrders.map((order) => ({ id: order.orderId, customerName: order.customerName, claimedCode: order.claimedCode })),
    "en",
  );
  check("report document keeps engine counts", doc.counts.hold === withStatement.counts.hold && doc.counts.release === withStatement.counts.release);
  check("report document keeps every verdict", doc.orders.every((line, index) => line.verdict === withStatement.orders[index]?.verdict));

  console.log("\n== 3. Paid API in bypass (no Stellar) ==");
  await checkVerifyApi(engineOrders, enginePayments, statement);

  console.log("\n== 4. Seed mock shops into Postgres ==");
  const { sql, db } = loadDb();
  try {
    await sql`select 1`;
    check("postgres is reachable", true);

    await db.delete(sellers).where(inArray(sellers.id, [MOCK_AKINYI, MOCK_WANJIKU]));
    await db.insert(sellers).values([
      { id: MOCK_AKINYI, displayName: "Akinyi Otieno", email: "akinyi@mock.orderverify", language: "en", weeklyCapKes: 50, walletBalanceUsd: "2.0000000" },
      { id: MOCK_WANJIKU, displayName: "Jane Wanjiku", email: "wanjiku@mock.orderverify", language: "sw", weeklyCapKes: 50, walletBalanceUsd: "2.0000000" },
    ]);

    const statementBatch = await insertVerifiedBatch(db, MOCK_AKINYI, "upload", engineOrders, enginePayments, statement, withStatement);
    const textSliceOrders = engineOrders.slice(0, 2);
    const textSlicePayments = enginePayments.slice(0, 2);
    const textSlice = verifyBatch(
      { batchId: "mock-text-slice", orders: textSliceOrders, payments: textSlicePayments, statementRows: null, priorCodes: [] },
      now,
    );
    const textBatch = await insertVerifiedBatch(db, MOCK_AKINYI, "whatsapp", textSliceOrders, textSlicePayments, [], textSlice);

    const stolenCode = engineOrders.find((order) => order.claimedCode)?.claimedCode ?? "UKN0000000";
    const stolenOrder: OrderInput = {
      orderId: "wanjiku-stolen",
      customerName: "Mary Wanjiku",
      items: [{ name: "Dress", qty: 1, unitPriceKes: 2500 }],
      expectedAmountKes: 2500,
      orderedAt: now.toISOString(),
      claimedCode: stolenCode,
    };
    const stolenPayment: PaymentInput = {
      paymentId: "p-stolen",
      rawText: enginePayments[0]?.rawText ?? `Confirmed. ${stolenCode} Confirmed. Ksh2,500.00 received from MARY WANJIKU.`,
      senderLabel: "M-PESA",
    };
    const wanjikuEngine = verifyBatch(
      { batchId: "mock-wanjiku", orders: [stolenOrder], payments: [stolenPayment], statementRows: null, priorCodes: [] },
      now,
    );
    const wanjikuHashes = [{ orderId: stolenOrder.orderId, claimedCodeHash: hashCode(stolenCode) }];
    const otherStatement = await db
      .select({ hash: mpesaRecords.transCodeHash })
      .from(mpesaRecords)
      .where(and(inArray(mpesaRecords.transCodeHash, [hashCode(stolenCode) ?? ""]), ne(mpesaRecords.sellerId, MOCK_WANJIKU)));
    const otherClaims = await db
      .select({ hash: orders.claimedCodeHash })
      .from(orders)
      .where(and(inArray(orders.claimedCodeHash, [hashCode(stolenCode) ?? ""]), ne(orders.sellerId, MOCK_WANJIKU)));
    const raised = applyNetworkHits(
      wanjikuEngine,
      new Map(wanjikuHashes.map((row) => [row.orderId, row.claimedCodeHash])),
      new Set(otherStatement.map((row) => row.hash)),
      new Set(otherClaims.map((row) => row.hash).filter((value): value is string => Boolean(value))),
    );
    check("cross-shop statement raises to HOLD", raised.report.orders[0]?.verdict === "HOLD");
    check("cross-shop never grants STATEMENT_VERIFIED from the other shop", raised.report.orders[0]?.tier !== "STATEMENT_VERIFIED" || wanjikuEngine.orders[0]?.tier === "STATEMENT_VERIFIED");
    await insertVerifiedBatch(db, MOCK_WANJIKU, "tiktok", [stolenOrder], [stolenPayment], [], raised.report, raised.reasonsByOrder);

    const akinyiBatches = await db.select().from(batches).where(eq(batches.sellerId, MOCK_AKINYI));
    const wanjikuBatches = await db.select().from(batches).where(eq(batches.sellerId, MOCK_WANJIKU));
    check("Akinyi has two history batches", akinyiBatches.length === 2);
    check("Wanjiku has one history batch", wanjikuBatches.length === 1);

    console.log("\n== 5. History decrypt + ownership ==");
    const akinyiOrders = await db.select().from(orders).where(eq(orders.sellerId, MOCK_AKINYI));
    const names = akinyiOrders.map((row) => decryptOrEmpty(row.buyerNameEnc) || row.customerName);
    check("encrypted names decrypt for the owner", names.some((name) => name.includes("Mary") || name.includes("Wanjiku") || name.length > 2));
    check("plaintext customerName stays empty", akinyiOrders.every((row) => row.customerName === ""));
    const leaked = await db
      .select()
      .from(batches)
      .where(and(eq(batches.sellerId, MOCK_AKINYI), inArray(batches.id, wanjikuBatches.map((row) => row.id))));
    check("Akinyi cannot select Wanjiku's batch by id", leaked.length === 0);

    console.log("\n== 6. Select + delete selected, then delete all ==");
    const owned = await db
      .select({ id: batches.id })
      .from(batches)
      .where(and(eq(batches.sellerId, MOCK_AKINYI), inArray(batches.id, [textBatch.id, "00000000-0000-0000-0000-000000000000"])));
    check("delete selected only returns owned ids", owned.length === 1 && owned[0]?.id === textBatch.id);
    await db.delete(batches).where(and(eq(batches.sellerId, MOCK_AKINYI), inArray(batches.id, owned.map((row) => row.id))));
    const afterSelected = await db.select().from(batches).where(eq(batches.sellerId, MOCK_AKINYI));
    check("delete selected removed one Akinyi batch", afterSelected.length === 1 && afterSelected[0]?.id === statementBatch.id);
    const wanjikuStill = await db.select().from(batches).where(eq(batches.sellerId, MOCK_WANJIKU));
    check("delete selected did not touch Wanjiku", wanjikuStill.length === 1);

    await db.delete(batches).where(eq(batches.sellerId, MOCK_AKINYI));
    const afterAll = await db.select().from(batches).where(eq(batches.sellerId, MOCK_AKINYI));
    const akinyiOrdersLeft = await db.select().from(orders).where(eq(orders.sellerId, MOCK_AKINYI));
    check("delete all history removes Akinyi batches", afterAll.length === 0);
    check("cascade removes Akinyi orders", akinyiOrdersLeft.length === 0);
    check("Wanjiku history remains after Akinyi delete-all", (await db.select().from(batches).where(eq(batches.sellerId, MOCK_WANJIKU))).length === 1);
    check("Akinyi seller row (sign-in) remains", (await db.select().from(sellers).where(eq(sellers.id, MOCK_AKINYI))).length === 1);

    if (clean) {
      await db.delete(sellers).where(inArray(sellers.id, [MOCK_AKINYI, MOCK_WANJIKU]));
      console.log("\n  cleaned mock sellers");
    } else {
      // Re-seed so History-style queries still have something to show after the delete tests.
      await db.delete(sellers).where(inArray(sellers.id, [MOCK_AKINYI, MOCK_WANJIKU]));
      await db.insert(sellers).values([
        { id: MOCK_AKINYI, displayName: "Akinyi Otieno", email: "akinyi@mock.orderverify", language: "en", weeklyCapKes: 50, walletBalanceUsd: "2.0000000" },
        { id: MOCK_WANJIKU, displayName: "Jane Wanjiku", email: "wanjiku@mock.orderverify", language: "sw", weeklyCapKes: 50, walletBalanceUsd: "2.0000000" },
      ]);
      await insertVerifiedBatch(db, MOCK_AKINYI, "upload", engineOrders, enginePayments, statement, withStatement);
      await insertVerifiedBatch(db, MOCK_WANJIKU, "tiktok", [stolenOrder], [stolenPayment], [], raised.report, raised.reasonsByOrder);
      console.log("\n  mock shops left in the database:");
      console.log(`    ${MOCK_AKINYI}  (Akinyi Otieno — statement batch)`);
      console.log(`    ${MOCK_WANJIKU} (Jane Wanjiku — cross-shop HOLD)`);
      console.log("  pass --clean to remove them");
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * POST a demo batch at an in-process verify-api with payment disabled.
 */
async function checkVerifyApi(engineOrders: OrderInput[], enginePayments: PaymentInput[], statement: StatementRowInput[]): Promise<void> {
  const app = await createApp({ requirePayment: false });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    const healthBody = (await health.json()) as { ok?: boolean; payment?: string };
    check("verify-api /health", health.ok && healthBody.ok === true);
    check("verify-api reports bypass when payment is off", healthBody.payment === "bypass");

    const missingKey = await fetch(`http://127.0.0.1:${port}/v1/verify-batch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        batchId: "no-key",
        orders: engineOrders.slice(0, 1),
        payments: [],
        statementRows: null,
        priorCodes: [],
      }),
    });
    check("verify-api requires Idempotency-Key", missingKey.status === 400);

    const oversized = await fetch(`http://127.0.0.1:${port}/v1/verify-batch`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "mock-too-big" },
      body: JSON.stringify({
        batchId: "too-big",
        orders: Array.from({ length: 51 }, (_, index) => ({
          orderId: `o${index}`,
          customerName: "Test",
          items: [{ name: "Item", qty: 1 }],
          expectedAmountKes: 100,
          orderedAt: new Date().toISOString(),
          claimedCode: null,
        })),
        payments: [],
        statementRows: null,
        priorCodes: [],
      }),
    });
    check("verify-api rejects 51 orders with 413", oversized.status === 413);

    const paid = await fetch(`http://127.0.0.1:${port}/v1/verify-batch`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "mock-system-check-1" },
      body: JSON.stringify({
        batchId: "mock-api-statement",
        orders: engineOrders,
        payments: enginePayments,
        statementRows: statement,
        priorCodes: [],
      }),
    });
    const report = (await paid.json()) as BatchReport;
    check("verify-api returns a report", paid.ok && Array.isArray(report.orders) && report.orders.length === engineOrders.length);
    check("verify-api statement tier", report.tier === "STATEMENT_VERIFIED");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

type Db = ReturnType<typeof loadDb>["db"];

/**
 * Insert one finished batch the same way POST /api/batches + persist verdicts would.
 *
 * @returns The batch row
 */
async function insertVerifiedBatch(
  db: Db,
  sellerId: string,
  source: "upload" | "whatsapp" | "tiktok",
  engineOrders: OrderInput[],
  enginePayments: PaymentInput[],
  statement: StatementRowInput[],
  report: BatchReport,
  reasonsByOrder?: Map<string, { id: string; en: string; sw: string }[]>,
): Promise<{ id: string }> {
  const tier = statement.length > 0 ? "STATEMENT_VERIFIED" : "TEXT_ONLY";
  const [batch] = await db
    .insert(batches)
    .values({ sellerId, status: "done", evidenceTier: report.tier ?? tier, completedAt: new Date() })
    .returning({ id: batches.id });
  if (!batch) throw new Error("batch insert failed");

  const idByDemo = new Map<string, string>();
  for (const order of engineOrders) {
    const [row] = await db
      .insert(orders)
      .values({
        batchId: batch.id,
        sellerId,
        source,
        customerName: "",
        buyerNameEnc: encrypt(order.customerName),
        buyerNameHash: hashName(order.customerName),
        items: order.items,
        itemSummary: order.items.map((item) => item.name).join(", "),
        expectedAmountKes: order.expectedAmountKes,
        claimedAmountKes: order.expectedAmountKes,
        orderedAt: new Date(order.orderedAt),
        claimedCode: null,
        claimedCodeEnc: order.claimedCode ? encrypt(order.claimedCode) : null,
        claimedCodeHash: hashCode(order.claimedCode),
        chatExcerpt: `${order.customerName}: order`,
      })
      .returning({ id: orders.id });
    if (!row) throw new Error("order insert failed");
    idByDemo.set(order.orderId, row.id);
  }

  if (enginePayments.length) {
    await db.insert(paymentEvidence).values(
      enginePayments.map((item) => ({
        batchId: batch.id,
        rawText: item.rawText,
        parsed: null,
        senderLabel: item.senderLabel,
      })),
    );
  }

  if (statement.length) {
    await db.insert(statementRows).values(
      statement.map((row) => ({
        batchId: batch.id,
        receiptNo: row.receiptNo,
        completedAt: row.completedAt ? new Date(row.completedAt) : null,
        details: row.details,
        status: row.status,
        paidInKes: row.paidInKes === null ? null : String(row.paidInKes),
        withdrawnKes: row.withdrawnKes === null ? null : String(row.withdrawnKes),
      })),
    );
    const mpesaValues = statement
      .map((row) => {
        const code = row.receiptNo?.trim();
        const hash = hashCode(code);
        if (!code || !hash) return null;
        return {
          batchId: batch.id,
          sellerId,
          transCodeEnc: encrypt(code),
          transCodeHash: hash,
          amountKes: row.paidInKes === null ? null : Math.round(row.paidInKes),
          payerNameEnc: row.details ? encrypt(row.details) : null,
          payerNameHash: hashName(row.details),
          receivedAt: row.completedAt ? new Date(row.completedAt) : null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    if (mpesaValues.length) {
      await db.insert(mpesaRecords).values(mpesaValues).onConflictDoNothing({
        target: [mpesaRecords.transCodeHash, mpesaRecords.sellerId],
      });
    }
  }

  const remapped: BatchReport = {
    ...report,
    batchId: batch.id,
    orders: report.orders.map((order) => ({
      ...order,
      orderId: idByDemo.get(order.orderId) ?? order.orderId,
    })),
  };
  await db.insert(reports).values({
    batchId: batch.id,
    engineVersion: remapped.engineVersion,
    report: remapped,
  });

  for (const order of remapped.orders) {
    const engine = report.orders.find((item) => (idByDemo.get(item.orderId) ?? item.orderId) === order.orderId);
    await db
      .update(orders)
      .set({
        verdict: order.verdict,
        engineVerdict: engine?.verdict ?? order.verdict,
        tier: engine?.tier ?? order.tier,
        reasons: reasonsByOrder?.get(engine?.orderId ?? "") ?? [],
      })
      .where(eq(orders.id, order.orderId));
  }
  return batch;
}

main()
  .then(() => {
    console.log("");
    if (failures.length) {
      console.log(`System check failed (${failures.length}):`);
      for (const name of failures) console.log(`  - ${name}`);
      process.exit(1);
    }
    console.log("System check passed.");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
