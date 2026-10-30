import { neon } from "@neondatabase/serverless";
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
