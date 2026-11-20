/**
 * apps/web/src/server/db/migrate.ts
 * Applies drizzle/0001_init.sql. Safe to run more than once.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../../../../.env") });

const databaseUrl = process.env.DATABASE_URL ?? "postgres://orderverify:orderverify@localhost:5433/orderverify";

/**
 * Apply the SQL migration.
 * @returns Resolves when the statements have been run
 */
export async function migrate(): Promise<void> {
  const sqlText = readFileSync(join(here, "../../../drizzle/0001_init.sql"), "utf8");
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    // postgres.js prepares one command at a time, so a whole file must be split.
    for (const statement of sqlStatements(sqlText)) {
      await sql.unsafe(statement);
    }
  } finally {
    await sql.end();
  }
}

function sqlStatements(file: string): string[] {
  // Line comments are removed first. One of them contains a semicolon ("start; designed").
  const withoutComments = file
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return withoutComments
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
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
