# Privacy

OrderVerify is a demo for a seller checking her own orders.

- Full phone numbers are not stored. A salted hash and the last three digits are kept, so a repeat can be recognised without keeping the number.
- Chat text sent to the language model is redacted first. The model is not given tools and cannot change a verdict, a price, or who gets paid.
- Raw chat excerpts are cleared after 7 days by `scripts/cleanup-retention.mjs`. Use Delete my data in Settings to remove the seller and every related row immediately.
- Payment messages are treated as untrusted text. They are evidence, not instructions.
- Secrets (`AGENT_SECRET`, `OZ_API_KEY`, `ANTHROPIC_API_KEY`) stay in server environment variables.
- Nothing here is shared with another seller. There is no account password because this build is a single demo session in a cookie.
