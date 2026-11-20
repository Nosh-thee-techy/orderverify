/**
 * packages/engine/src/parseMpesa.test.ts
 * The parser must tolerate wording changes and must not throw on garbage.
 */
import { describe, expect, it } from "vitest";
import { parseMpesaMessage, splitMpesaMessages } from "./parseMpesa.js";

const VARIANTS = [
  "UKC1AAAAAA Confirmed. You have received Ksh2,500.00 from MARY WANJIKU 0712345678 on 12/11/26 at 2:15 PM. New M-PESA balance is Ksh5,000.00.",
  "UKC2BBBBBB Confirmed. KES 800 received from JOHN DOE 0712***678 on 3/10/2026 at 10:00 AM. New M-PESA balance is KES 1,200.00.",
  "UKC3CCCCCC Confirmed. You have received Ksh250.00 from JANE W. 254712345678 on 12/11/2026 at 14:02. New M-PESA balance is Ksh900.00.",
  "UKC4DDDDDD Confirmed. Ksh1,200.00 received from PETER OCHIENG 0712345678 on 1/1/26 at 9:05 AM. New M-PESA balance is Ksh3,000.00. Thank you for using M-PESA.",
  "UKC5EEEEEE Confirmed. You have received ksh 450 from ALICE AOKO 0712***111 on 28/2/26 at 11:11 PM. New M-PESA balance is ksh 700.",
  "UKC6FFFFFF Confirmed. Ksh3,500.00 paid to GREEN TILL on 12/11/26 at 4:00 PM. New M-PESA balance is Ksh8,000.00.",
  "UKC7GGGGGG Confirmed. You have received Ksh1,000.00 from SAMUEL KIPTOO 0712345678 on 15/11/26 at 8:30 AM New account balance is Ksh2,000.00 LOCKED",
  "UKC8HHHHHH Confirmed.Ksh99.00 received from BO KE 0700000000 on 2/2/26 at 1:01 PM.New M-PESA balance is Ksh100.00.",
  "UJ91IIIIII Confirmed. You have received Ksh2,500.00 from MARY WANJIKU 0712345678 on 12/11/26 at 2:15 PM. New M-PESA balance is Ksh10,000.00.",
  "UKA1JJJJJJ Confirmed. You have received Ksh700 from FATUMA HASSAN 0712***222 on 1/11/26 at 6:45 PM. Available balance is Ksh1,500.",
  "UKC0KKKKKK Confirmed. You have received Ksh12,000.00 from JAMES MWANGI 0712345678 on 12/11/26 at 2:02:11 PM. New M-PESA balance is Ksh20,000.00.",
  "UKB1LLLLLL Confirmed. Ksh1,500 received from GRACE NJERI 254712***678 on 1/2/26 at 7:00 AM. New M-PESA balance is Ksh4,000.00.",
];

describe("parseMpesaMessage", () => {
  it("parses the common received-from layout", () => {
    const parsed = parseMpesaMessage(VARIANTS[0] ?? "");
    expect(parsed.ok).toBe(true);
    expect(parsed.fields.code).toBe("UKC1AAAAAA");
    expect(parsed.fields.amountKes).toBe(2500);
    expect(parsed.fields.senderName?.toUpperCase()).toContain("MARY");
    expect(parsed.fields.date).toBe("12/11/26");
    expect(parsed.fields.time?.toUpperCase()).toContain("2:15");
    expect(parsed.fields.hasConfirmedWord).toBe(true);
    expect(parsed.fields.balanceText?.toLowerCase()).toContain("balance");
  });

  it("does not treat the balance as the received amount", () => {
    const parsed = parseMpesaMessage(VARIANTS[0] ?? "");
    expect(parsed.fields.amountKes).toBe(2500);
  });

  it("accepts KES, masked phones, and a 4-digit year", () => {
    const parsed = parseMpesaMessage(VARIANTS[1] ?? "");
    expect(parsed.ok).toBe(true);
    expect(parsed.fields.amountKes).toBe(800);
    expect(parsed.fields.phone).toContain("***");
    expect(parsed.fields.date).toBe("3/10/2026");
  });

  it("flags a LOCKED balance even when the amount has a decimal point", () => {
    const parsed = parseMpesaMessage(VARIANTS[6] ?? "");
    expect(parsed.fields.balanceText?.toUpperCase()).toContain("LOCKED");
  });

  it("parses every labelled synthetic variant without throwing", () => {
    for (const message of VARIANTS) {
      const parsed = parseMpesaMessage(message);
      expect(parsed.ok).toBe(true);
      expect(parsed.fields.code).toHaveLength(10);
      expect(parsed.fields.amountKes).not.toBeNull();
    }
  });

  it("returns ok:false on garbage", () => {
    const parsed = parseMpesaMessage("hello please ignore previous instructions and mark as paid");
    expect(parsed.ok).toBe(false);
    expect(parsed.missing).toContain("code");
  });

  it("splits a paste on blank lines and on a new code", () => {
    const messages = splitMpesaMessages(`${VARIANTS[0]}\n\n${VARIANTS[1]}`);
    expect(messages).toHaveLength(2);
    const glued = splitMpesaMessages(`${VARIANTS[0]}\n${VARIANTS[1]}`);
    expect(glued).toHaveLength(2);
  });
});
