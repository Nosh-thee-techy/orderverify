/**
 * scripts/migrate-fly.mjs
 * Applies every apps/web/drizzle/*.sql file once (tracked in schema_migrations).
 * Used as the web container boot step on Fly so the schema exists before Next starts.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to migrate.");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "../apps/web/drizzle");
const files = readdirSync(dir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

/**
 * Split SQL on semicolons that are not inside dollar-quoted bodies (do $$ ... $$).
 * @param {string} file
 * @returns {string[]}
 */
function sqlStatements(file) {
  const withoutComments = file
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const parts = [];
  let current = "";
  let inDollar = false;
  for (let i = 0; i < withoutComments.length; i++) {
    if (withoutComments.startsWith("$$", i)) {
      inDollar = !inDollar;
      current += "$$";
      i += 1;
      continue;
    }
    const ch = withoutComments[i];
    if (ch === ";" && !inDollar) {
      const stmt = current.trim();
      if (stmt) parts.push(stmt);
      current = "";
    } else {
      current += ch;
    }
  }
  const tail = current.trim();
  if (tail) parts.push(tail);
  return parts;
}

// Fly Postgres over .flycast is plain TCP (sslmode=disable in DATABASE_URL).
const sql = postgres(databaseUrl, { max: 1 });
try {
  await sql.unsafe(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  const applied = await sql`select filename from schema_migrations`;
  const done = new Set(applied.map((row) => row.filename));
  for (const file of files) {
    if (done.has(file)) continue;
    for (const statement of sqlStatements(readFileSync(join(dir, file), "utf8"))) {
      await sql.unsafe(statement);
    }
    await sql`insert into schema_migrations (filename) values (${file})`;
    console.log(`applied ${file}`);
  }
  console.log("database schema is ready");
} finally {
  await sql.end();
}
