/**
 * scripts/migrate-fly.mjs
 * Applies apps/web/drizzle/0001_init.sql using DATABASE_URL.
 * Used as the web container boot step on Fly so the schema exists before Next starts.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to migrate.");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sqlText = readFileSync(join(here, "../apps/web/drizzle/0001_init.sql"), "utf8");
const withoutComments = sqlText
  .split(/\r?\n/)
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");
const statements = withoutComments
  .split(";")
  .map((part) => part.trim())
  .filter(Boolean);

// Fly Postgres over .flycast is plain TCP (sslmode=disable in DATABASE_URL).
const sql = postgres(databaseUrl, { max: 1 });
try {
  for (const statement of statements) {
    await sql.unsafe(statement);
  }
  console.log("database schema is ready");
} finally {
  await sql.end();
}
