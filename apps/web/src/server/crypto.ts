/**
 * apps/web/src/server/crypto.ts
 * AES-256-GCM encryption and HMAC-SHA256 hashing for seller-owned PII.
 * Never log decrypted values. PHONE_HASH_SALT is not used here.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { z } from "zod";

const hex32 = z.string().regex(/^[0-9a-f]{64}$/i, "must be 32-byte hex");

const secretsSchema = z.object({
  DATA_ENCRYPTION_KEY: hex32,
  HASH_PEPPER: hex32,
});

/**
 * Read and validate encryption secrets. Throws if either is missing or the wrong length.
 * @returns Raw 32-byte key and pepper
 */
export function encryptionSecrets(): { key: Buffer; pepper: Buffer } {
  const parsed = secretsSchema.safeParse({
    DATA_ENCRYPTION_KEY: process.env.DATA_ENCRYPTION_KEY,
    HASH_PEPPER: process.env.HASH_PEPPER,
  });
  if (!parsed.success) {
    throw new Error("DATA_ENCRYPTION_KEY and HASH_PEPPER must each be 32-byte hex (64 characters).");
  }
  return {
    key: Buffer.from(parsed.data.DATA_ENCRYPTION_KEY, "hex"),
    pepper: Buffer.from(parsed.data.HASH_PEPPER, "hex"),
  };
}

/**
 * Encrypt a UTF-8 string with AES-256-GCM.
 * @param plain - Value to store. Empty string is still encrypted.
 * @returns base64 iv.tag.ciphertext with a fresh 12-byte IV
 */
export function encrypt(plain: string): string {
  const { key } = encryptionSecrets();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

/**
 * Decrypt a value produced by encrypt(). Tampered ciphertext throws.
 * @param cipher - iv.tag.ciphertext
 * @returns Original UTF-8 string
 */
export function decrypt(cipher: string): string {
  const { key } = encryptionSecrets();
  const parts = cipher.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error("Invalid ciphertext");
  }
  const iv = Buffer.from(parts[0], "base64");
  const tag = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/**
 * Decrypt without throwing. Used when reading rows that may predate encryption.
 * @param cipher - Stored ciphertext or null
 * @returns Plain text, or empty string when missing / invalid
 */
export function decryptOrEmpty(cipher: string | null | undefined): string {
  if (!cipher) return "";
  try {
    return decrypt(cipher);
  } catch {
    return "";
  }
}

/**
 * HMAC-SHA256 of a already-normalized value.
 * @param value - Normalized plaintext
 * @returns Hex digest
 */
export function hmac(value: string): string {
  const { pepper } = encryptionSecrets();
  return createHmac("sha256", pepper).update(value, "utf8").digest("hex");
}

/**
 * Uppercase, trim. M-Pesa codes are matched case-insensitively.
 * @param value - Raw claimed or statement code
 */
export function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Uppercase, strip punctuation, collapse spaces.
 * @param value - Buyer or payer name
 */
export function normalizeName(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Kenyan-first E.164 digits: 2547XXXXXXXX.
 * @param value - Raw phone text
 */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("254") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

/**
 * Hash a code after normalization. Empty input returns null.
 * @param value - Raw code
 */
export function hashCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = normalizeCode(value);
  return normalized ? hmac(normalized) : null;
}

/**
 * Hash a name after normalization. Empty input returns null.
 * @param value - Raw name
 */
export function hashName(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = normalizeName(value);
  return normalized ? hmac(normalized) : null;
}

/**
 * Hash a phone after E.164 normalization. Empty input returns null.
 * @param value - Raw phone
 */
export function hashPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = normalizePhone(value);
  return normalized ? hmac(normalized) : null;
}
