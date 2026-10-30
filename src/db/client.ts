import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

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

/** Cheapest possible round-trip to prove a connection string works. */
export async function pingDb(url: string): Promise<void> {
  await getDb(url).execute(sql`select 1`);
}
