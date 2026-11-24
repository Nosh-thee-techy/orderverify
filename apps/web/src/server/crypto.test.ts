/**
 * apps/web/src/server/crypto.test.ts
 * AES-GCM roundtrip, unique IVs, tamper detection, and stable normalized HMACs.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decrypt, encrypt, hashCode, hmac, normalizeCode, normalizeName, normalizePhone } from "./crypto";

const KEY = "a".repeat(64);
const PEPPER = "b".repeat(64);

describe("crypto", () => {
  const previousKey = process.env.DATA_ENCRYPTION_KEY;
  const previousPepper = process.env.HASH_PEPPER;

  beforeEach(() => {
    process.env.DATA_ENCRYPTION_KEY = KEY;
    process.env.HASH_PEPPER = PEPPER;
  });

  afterEach(() => {
    process.env.DATA_ENCRYPTION_KEY = previousKey;
    process.env.HASH_PEPPER = previousPepper;
  });

  it("encrypts and decrypts a roundtrip", () => {
    const cipher = encrypt("Mary Wanjiku");
    expect(decrypt(cipher)).toBe("Mary Wanjiku");
  });

  it("uses a different IV each time", () => {
    const first = encrypt("UKN3A1B2C4");
    const second = encrypt("UKN3A1B2C4");
    expect(first).not.toBe(second);
    expect(decrypt(first)).toBe("UKN3A1B2C4");
    expect(decrypt(second)).toBe("UKN3A1B2C4");
  });

  it("throws when the ciphertext is tampered", () => {
    const cipher = encrypt("secret");
    const parts = cipher.split(".");
    const last = Buffer.from(parts[2] ?? "", "base64");
    last[0] = (last[0] ?? 0) ^ 0xff;
    parts[2] = last.toString("base64");
    expect(() => decrypt(parts.join("."))).toThrow();
  });

  it("hashes codes stably after normalization", () => {
    expect(normalizeCode(" ukn3a1b2c4 ")).toBe("UKN3A1B2C4");
    expect(hashCode(" ukn3a1b2c4 ")).toBe(hashCode("UKN3A1B2C4"));
    expect(hmac("UKN3A1B2C4")).toBe(hashCode("UKN3A1B2C4"));
  });

  it("normalizes names and Kenyan phones", () => {
    expect(normalizeName("  Mary,  Wanjiku ")).toBe("MARY WANJIKU");
    expect(normalizePhone("0712 345 678")).toBe("254712345678");
    expect(normalizePhone("+254712345678")).toBe("254712345678");
  });
});
