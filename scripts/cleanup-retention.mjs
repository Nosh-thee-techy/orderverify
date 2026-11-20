/**
 * scripts/cleanup-retention.mjs
 * Blanks chat excerpts and raw payment text older than RETENTION_DAYS (default 7).
 * Parsed fields and verdicts stay, so the audit trail remains without the raw chat.
 */
import postgres from "postgres";

const days = Number(process.env.RETENTION_DAYS ?? 7);
const sql = postgres(process.env.DATABASE_URL ?? "postgres://orderverify:orderverify@localhost:5432/orderverify");
const orders = await sql`
  update orders set chat_excerpt = ''
  where chat_excerpt <> ''
    and ordered_at < now() - (${days} || ' days')::interval
`;
const evidence = await sql`
  update payment_evidence set raw_text = '[removed after retention window]'
  where raw_text <> '[removed after retention window]'
    and id in (
      select payment_evidence.id from payment_evidence
      join batches on batches.id = payment_evidence.batch_id
      where batches.created_at < now() - (${days} || ' days')::interval
    )
`;
console.log(`Cleared ${orders.count} excerpts and ${evidence.count} messages older than ${days} days.`);
await sql.end();
