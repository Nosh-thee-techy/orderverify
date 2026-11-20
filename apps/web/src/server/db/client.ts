/**
 * apps/web/src/server/db/client.ts
 * One Postgres connection for the Next.js server. Never import this from a client component.
 */
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let cached: { db: Database; sql: ReturnType<typeof postgres> } | null = null;

/**
 * Open (or reuse) the database.
 * @returns A drizzle client bound to DATABASE_URL
 */
export function getDb(): Database {
  if (cached) return cached.db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 5 });
  cached = { db: drizzle(sql, { schema }), sql };
  return cached.db;
}

export { schema };
