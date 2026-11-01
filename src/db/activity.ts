import { desc } from "drizzle-orm";
import type { Db, TxDb } from "./client";
import { activityLog } from "./schema";

/** Any drizzle handle, inside or outside a transaction. */
type AnyDb = Db | TxDb;

export type AuditActor = { userId: number | null; name: string; role?: "owner" | "ca" | "staff" };

let currentActor: AuditActor = { userId: null, name: "local" };

/** Set on login; cleared on lock/logout (L5). Every audit row uses this actor. */
export function setAuditActor(actor: AuditActor | null): void {
  currentActor = actor ?? { userId: null, name: "local" };
}

export function getAuditActor(): AuditActor {
  return currentActor;
}

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
    userId: currentActor.userId,
    actor: currentActor.name,
  });
}

export type ActivityRow = {
  id: number;
  at: Date;
  actor: string;
  event: string;
  summary: string;
};

/** Newest first. `offset` pages through the list (the Activity screen loads 20 at a time). */
export async function listActivity(db: Db, limit = 25, offset = 0): Promise<ActivityRow[]> {
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
    .limit(limit)
    .offset(offset);
}
