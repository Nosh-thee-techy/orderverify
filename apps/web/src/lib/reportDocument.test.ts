/**
 * apps/web/src/lib/reportDocument.test.ts
 * The shared report view must pass engine verdicts through unchanged.
 */
import { describe, expect, it } from "vitest";
import type { BatchReport } from "@orderverify/engine";
import { buildReportDocument, pdfFilename, shortBatchRef } from "./reportDocument";

const report: BatchReport = {
  reportId: "r1",
  batchId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  engineVersion: "test",
  createdAt: "2026-11-23T12:00:00.000Z",
  tier: "TEXT_ONLY",
  counts: { release: 1, review: 0, hold: 1 },
  moneyHeldKes: 2500,
  orders: [
    {
      orderId: "11111111-1111-1111-1111-111111111111",
      verdict: "RELEASE",
      tier: "TEXT_ONLY",
      headlineEn: "Payment matches the order.",
      headlineSw: "Malipo yanalingana na oda.",
      matchedPaymentId: "p1",
      checks: [
        {
          id: "AMOUNT",
          status: "pass",
          titleEn: "Amount",
          titleSw: "Kiasi",
          plainEn: "The amounts match.",
          plainSw: "Kiasi kinalingana.",
          evidence: {},
        },
      ],
      amountPaidKes: 1200,
      amountExpectedKes: 1200,
    },
    {
      orderId: "22222222-2222-2222-2222-222222222222",
      verdict: "HOLD",
      tier: "TEXT_ONLY",
      headlineEn: "Possible duplicate code.",
      headlineSw: "Kodi inaweza kuwa nakala.",
      matchedPaymentId: null,
      checks: [
        {
          id: "DUPLICATE_CODE",
          status: "fail",
          titleEn: "Duplicate code",
          titleSw: "Kodi inayojirudia",
          plainEn: "This code was already used on an earlier order.",
          plainSw: "Kodi hii ilitumika kwenye oda ya awali.",
          evidence: {},
        },
      ],
      amountPaidKes: null,
      amountExpectedKes: 2500,
    },
  ],
  unmatchedPayments: [{ paymentId: "p9", code: "ABC123", amountKes: 300 }],
};

describe("report document", () => {
  it("keeps engine verdicts, counts, and unmatched payments", () => {
    const doc = buildReportDocument(
      report,
      [
        { id: "11111111-1111-1111-1111-111111111111", customerName: "Amina", claimedCode: "XYZ111" },
        { id: "22222222-2222-2222-2222-222222222222", customerName: "Brian", claimedCode: null },
      ],
      "en",
    );
    expect(doc.counts).toEqual({ total: 2, release: 1, review: 0, hold: 1 });
    expect(doc.orders[0]?.verdict).toBe("RELEASE");
    expect(doc.orders[0]?.customerName).toBe("Amina");
    expect(doc.orders[0]?.paymentRef).toBe("XYZ111");
    expect(doc.orders[1]?.explanation).toBe("This code was already used on an earlier order.");
    expect(doc.unmatchedPayments).toEqual([{ paymentId: "p9", code: "ABC123", amountKes: 300 }]);
  });

  it("uses Kiswahili headlines when asked", () => {
    const doc = buildReportDocument(report, [], "sw");
    expect(doc.orders[0]?.headline).toBe("Malipo yanalingana na oda.");
  });

  it("builds a safe PDF filename from the batch id", () => {
    expect(shortBatchRef(report.batchId)).toBe("AAAAAAAA");
    expect(pdfFilename(report.batchId)).toBe("OrderVerify_Report_AAAAAAAA.pdf");
    expect(pdfFilename("")).toBe("OrderVerify_Report_BATCH.pdf");
  });
});
