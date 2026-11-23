/**
 * packages/engine/src/parsers.test.ts
 * WhatsApp exports and statement CSVs are untrusted files from the seller's phone.
 */
import { describe, expect, it } from "vitest";
import { parseStatement, parseStatementCsv } from "./parseStatement.js";
import { parseWhatsAppExport } from "./parseWhatsApp.js";
import { redactPhones } from "./redact.js";
import { weekStartNairobi } from "./dates.js";
import { wouldExceedCap, priceKes } from "./policy.js";

describe("parseWhatsAppExport", () => {
  it("reads the dash layout, the bracket layout, and a wrapped line", () => {
    const text = [
      "12/11/2026, 14:02 - Messages and calls are end-to-end encrypted",
      "12/11/2026, 14:03 - Akinyi: Habari, the dress is KES 2,500",
      "call me on 0712345678",
      "[12/11/26, 2:04:11 PM] Mary: Nataka dress. My number is 0712000111",
    ].join("\n");
    const messages = parseWhatsAppExport(text);
    expect(messages).toHaveLength(2);
    expect(messages[0]?.from).toBe("Akinyi");
    expect(messages[0]?.text).toContain("07XX XXX ###");
    expect(messages[0]?.text).toContain("call me");
    expect(messages[1]?.from).toBe("Mary");
    expect(messages[1]?.at.toISOString()).toBe("2026-11-12T11:04:11.000Z");
  });
});

describe("parseStatement", () => {
  it("reads receipt rows from a PDF-style text dump", () => {
    const text = [
      "M-PESA STATEMENT",
      "UKC1234567 12/11/2026 14:02:00 Customer Payment from MARY Completed 2,500.00 0.00 8,000.00",
      "ABC9990001 12/11/2026 15:10:00 Pay Bill Completed 0.00 200.00 7,800.00",
    ].join("\n");
    const rows = parseStatement(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.receiptNo).toBe("UKC1234567");
    expect(rows[0]?.paidInKes).toBe(2500);
  });
});

describe("parseStatementCsv", () => {
  it("reads a statement even when the paid-in column is not first", () => {
    const csv = [
      "Details,Receipt No,Completion Time,Status,Withdrawn,Paid in,Balance",
      "Received from MARY,UKC1234567,12/11/2026 14:02:00,Completed,0,\"2,500.00\",5000",
    ].join("\n");
    const rows = parseStatementCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.receiptNo).toBe("UKC1234567");
    expect(rows[0]?.paidInKes).toBe(2500);
    expect(rows[0]?.completedAt?.toISOString()).toBe("2026-11-12T11:02:00.000Z");
  });
});

describe("redactPhones", () => {
  it("masks a full Safaricom number and leaves a transaction code", () => {
    expect(redactPhones("code UKC1234567 from 0712345678")).toBe("code UKC1234567 from 07XX XXX ###");
  });
});

describe("week and cap", () => {
  it("starts the week on Monday 00:00 Nairobi, including the Sunday night boundary", () => {
    const justBefore = weekStartNairobi(new Date("2026-11-15T20:59:00.000Z"));
    const atMonday = weekStartNairobi(new Date("2026-11-15T21:00:00.000Z"));
    expect(justBefore.toISOString()).toBe("2026-11-08T21:00:00.000Z");
    expect(atMonday.toISOString()).toBe("2026-11-15T21:00:00.000Z");
    expect(weekStartNairobi(new Date("2026-11-20T09:00:00.000Z")).toISOString()).toBe(
      "2026-11-15T21:00:00.000Z",
    );
  });

  it("blocks the next payment once the cap cannot hold it", () => {
    expect(wouldExceedCap({ spentUsd: 0.38, priceUsd: 0.01, capKes: 50, kesPerUsd: 129 })).toBe(true);
    expect(wouldExceedCap({ spentUsd: 0, priceUsd: 0.01, capKes: 50, kesPerUsd: 129 })).toBe(false);
    expect(wouldExceedCap({ spentUsd: 0, priceUsd: 0.01, capKes: 0, kesPerUsd: 129 })).toBe(true);
    expect(priceKes(0.01, 129)).toBe(1.3);
  });
});
