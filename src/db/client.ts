import { neon, Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;
export type TxDb = NeonDatabase<typeof schema>;

/**
 * Build a database handle over Neon's HTTP driver.
 *
 * The URL is ALWAYS passed in by the caller (it comes from secure storage at
 * runtime) — it is never read from the environment or hard-coded in this file.
 */
export function getDb(url: string): Db {
  if (!url || !url.trim()) {
    throw new Error("getDb(url): a database URL is required");
  }
  return drizzle(neon(url), { schema });
}

/**
 * Transactional handle over a WebSocket pool. Callers MUST `close()` when done
 * (use `withTransaction`, which does it for you).
 */
export function getTxDb(url: string): { db: TxDb; close: () => Promise<void> } {
  if (!url || !url.trim()) {
    throw new Error("getTxDb(url): a database URL is required");
  }
  const pool = new Pool({ connectionString: url });
  return { db: drizzleWs(pool, { schema }), close: () => pool.end() };
}

/** Run `fn` inside ONE database transaction, closing the pool afterwards. */
export async function withTransaction<T>(
  url: string,
  fn: (tx: TxDb) => Promise<T>,
): Promise<T> {
  const { db, close } = getTxDb(url);
  try {
    return await db.transaction(fn);
  } finally {
    await close();
  }
}

/** Cheapest possible round-trip to prove a connection string works. */
export async function pingDb(url: string): Promise<void> {
  await getDb(url).execute(sql`select 1`);
}
