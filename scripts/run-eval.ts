/**
 * scripts/run-eval.ts
 * Runs the 30-order eval twice: text only, then with a statement.
 * Prints catch rate, false-flag rate, and a confusion matrix, and writes eval-results.json.
 */
import { writeFileSync } from "node:fs";
import { verifyBatch, type BatchReport, type Verdict } from "@orderverify/engine";
import { buildEvalSet, EVAL_NOW, type EvalCase, type ForgeryType } from "@orderverify/fixtures";

interface Matrix {
  genuine: Record<Verdict, number>;
  forged: Record<Verdict, number>;
}

interface ModeResult {
  catchRate: number;
  falseFlagRate: number;
  matrix: Matrix;
  byType: { type: ForgeryType; total: number; caught: number; missed: number }[];
}

const emptyVerdicts = (): Record<Verdict, number> => ({ RELEASE: 0, REVIEW: 0, HOLD: 0 });

function score(cases: EvalCase[], report: BatchReport): ModeResult {
  const matrix: Matrix = { genuine: emptyVerdicts(), forged: emptyVerdicts() };
  const byType = new Map<ForgeryType, { total: number; caught: number }>();
  cases.forEach((item, index) => {
    const verdict = report.orders[index]?.verdict ?? "RELEASE";
    matrix[item.truth][verdict] += 1;
    if (!item.forgery) return;
    const bucket = byType.get(item.forgery) ?? { total: 0, caught: 0 };
    bucket.total += 1;
    if (verdict !== "RELEASE") bucket.caught += 1;
    byType.set(item.forgery, bucket);
  });
  const forged = cases.filter((item) => item.truth === "forged").length;
  const genuine = cases.filter((item) => item.truth === "genuine").length;
  const caught = matrix.forged.HOLD + matrix.forged.REVIEW;
  const falseFlags = matrix.genuine.HOLD + matrix.genuine.REVIEW;
  return {
    catchRate: forged === 0 ? 0 : caught / forged,
    falseFlagRate: genuine === 0 ? 0 : falseFlags / genuine,
    matrix,
    byType: [...byType.entries()].map(([type, bucket]) => ({
      type,
      total: bucket.total,
      caught: bucket.caught,
      missed: bucket.total - bucket.caught,
    })),
  };
}

const bundle = buildEvalSet();
const orders = bundle.cases.map((item) => item.order);
const payments = bundle.cases.flatMap((item) => (item.payment ? [item.payment] : []));

const textOnly = verifyBatch(
  { batchId: "eval-text", orders, payments, statementRows: null, priorCodes: bundle.priorCodes },
  EVAL_NOW,
);
const withStatement = verifyBatch(
  {
    batchId: "eval-statement",
    orders,
    payments,
    statementRows: bundle.statementRows,
    priorCodes: bundle.priorCodes,
  },
  EVAL_NOW,
);

const results = {
  generatedAt: new Date().toISOString(),
  seed: bundle.seed,
  now: bundle.now,
  note: "Synthetic test set. A believable made-up code is missed from text alone and caught when the statement does not contain it.",
  textOnly: score(bundle.cases, textOnly),
  statement: score(bundle.cases, withStatement),
};

const pct = (value: number) => `${Math.round(value * 1000) / 10}%`;
function printMode(title: string, mode: ModeResult) {
  console.log(`\n${title}`);
  console.log(`  catch rate: ${pct(mode.catchRate)}   false-flag rate: ${pct(mode.falseFlagRate)}`);
  console.log(
    `  genuine  release ${mode.matrix.genuine.RELEASE}  review ${mode.matrix.genuine.REVIEW}  hold ${mode.matrix.genuine.HOLD}`,
  );
  console.log(
    `  forged   release ${mode.matrix.forged.RELEASE}  review ${mode.matrix.forged.REVIEW}  hold ${mode.matrix.forged.HOLD}`,
  );
  for (const row of mode.byType) {
    console.log(`  ${row.type}: caught ${row.caught}/${row.total}, missed ${row.missed}`);
  }
}

printMode("TEXT ONLY", results.textOnly);
printMode("WITH STATEMENT", results.statement);

writeFileSync(new URL("../eval-results.json", import.meta.url), JSON.stringify(results, null, 2));
writeFileSync(new URL("../apps/web/src/data/eval-results.json", import.meta.url), JSON.stringify(results, null, 2));
console.log("\nWrote eval-results.json");
