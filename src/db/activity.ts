import { desc } from "drizzle-orm";
import type { Db, TxDb } from "./client";
import { activityLog } from "./schema";

/** Any drizzle handle, inside or outside a transaction. */
type AnyDb = Db | TxDb;

export type ActivityEntry = {
  event: string;
  summary: string;
  entity?: string;
  entityId?: number;
};

/**
 * Append one audit row. Call it INSIDE the same transaction as the change it
 * describes, so the log can never disagree with the data.
 */
export async function logActivity(db: AnyDb, entry: ActivityEntry): Promise<void> {
  await db.insert(activityLog).values({
    event: entry.event,
    summary: entry.summary,
    entity: entry.entity ?? null,
    entityId: entry.entityId ?? null,
  });
}

export type ActivityRow = {
  id: number;
  at: Date;
  actor: string;
  event: string;
  summary: string;
};

/** Newest first, for the Settings screen. */
export async function listActivity(db: Db, limit = 25): Promise<ActivityRow[]> {
  return db
    .select({
      id: activityLog.id,
      at: activityLog.at,
      actor: activityLog.actor,
      event: activityLog.event,
      summary: activityLog.summary,
    })
    .from(activityLog)
    .orderBy(desc(activityLog.at), desc(activityLog.id))
    .limit(limit);
}
