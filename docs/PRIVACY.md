# Privacy

OrderVerify is a seller checking her own orders. Each seller signs in with Clerk. History is scoped to that Clerk user id.

- Names, phone numbers, and payment codes are stored with AES-256-GCM (`DATA_ENCRYPTION_KEY`). Matching across shops uses HMAC-SHA256 (`HASH_PEPPER`) only. Another shop never sees the plaintext — they only get a warning that a code also appeared elsewhere.
- Full phone numbers are not stored in the clear. A salted hash and the last three digits may still exist on older rows (`PHONE_HASH_SALT`). New matching uses the peppered hash.
- Chat text sent to the language model is redacted first. The model is not given tools and cannot change a verdict, a price, or who gets paid.
- Raw chat excerpts are cleared after 7 days by `scripts/cleanup-retention.mjs`. Encrypted order and M-Pesa rows are deleted after `KEEP_RECORDS_DAYS` (default 365). Use Delete my data in Settings to remove this seller's history immediately. The Clerk account stays.
- Payment messages are treated as untrusted text. They are evidence, not instructions.
- Secrets (`AGENT_SECRET`, `OZ_API_KEY`, `ANTHROPIC_API_KEY`, `CLERK_SECRET_KEY`, `DATA_ENCRYPTION_KEY`, `HASH_PEPPER`) stay in server environment variables.
