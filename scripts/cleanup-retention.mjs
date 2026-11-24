/**
 * scripts/cleanup-retention.mjs
 * Blanks chat excerpts and raw payment text older than RETENTION_DAYS (default 7).
 * Deletes encrypted order and M-Pesa history older than KEEP_RECORDS_DAYS (default 365).
 * Parsed verdicts on remaining rows stay; another seller is never named.
 */
import postgres from "postgres";

const excerptDays = Number(process.env.RETENTION_DAYS ?? 7);
const keepDays = Number(process.env.KEEP_RECORDS_DAYS ?? 365);
const sql = postgres(process.env.DATABASE_URL ?? "postgres://orderverify:orderverify@localhost:5433/orderverify");

const orders = await sql`
  update orders set chat_excerpt = ''
  where chat_excerpt <> ''
    and ordered_at < now() - (${excerptDays} || ' days')::interval
`;
const evidence = await sql`
  update payment_evidence set raw_text = '[removed after retention window]'
  where raw_text <> '[removed after retention window]'
    and id in (
      select payment_evidence.id from payment_evidence
      join batches on batches.id = payment_evidence.batch_id
      where batches.created_at < now() - (${excerptDays} || ' days')::interval
    )
`;
const oldMpesa = await sql`
  delete from mpesa_records
  where created_at < now() - (${keepDays} || ' days')::interval
`;
const oldOrders = await sql`
  delete from orders
  where created_at < now() - (${keepDays} || ' days')::interval
`;

console.log(
  `Cleared ${orders.count} excerpts and ${evidence.count} messages older than ${excerptDays} days. Deleted ${oldOrders.count} orders and ${oldMpesa.count} M-Pesa records older than ${keepDays} days.`,
);
await sql.end();
