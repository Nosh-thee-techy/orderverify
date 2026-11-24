/**
 * apps/web/src/server/db/migrate.ts
 * Applies every apps/web/drizzle/*.sql file once, in name order.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../../../../.env") });

const databaseUrl = process.env.DATABASE_URL ?? "postgres://orderverify:orderverify@localhost:5433/orderverify";

/**
 * Apply pending SQL migrations.
 * @returns Resolves when the statements have been run
 */
export async function migrate(): Promise<void> {
  const dir = join(here, "../../../drizzle");
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await sql.unsafe(`
      create table if not exists schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `);
    const applied = await sql<{ filename: string }[]>`select filename from schema_migrations`;
    const done = new Set(applied.map((row) => row.filename));
    for (const file of files) {
      if (done.has(file)) continue;
      const sqlText = readFileSync(join(dir, file), "utf8");
      for (const statement of sqlStatements(sqlText)) {
        await sql.unsafe(statement);
      }
      await sql`insert into schema_migrations (filename) values (${file})`;
    }
  } finally {
    await sql.end();
  }
}

/**
 * Split SQL on semicolons that are not inside dollar-quoted bodies (do $$ ... $$).
 * @param file - Migration text
 */
function sqlStatements(file: string): string[] {
  const withoutComments = file
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const parts: string[] = [];
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

if (process.argv[1]?.includes("migrate")) {
  migrate()
    .then(() => {
      console.log("database schema is ready");
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
