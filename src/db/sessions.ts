/**
 * Login sessions and per-user usage.
 *
 * Every sign-in opens a row in `user_sessions`; signing out closes it and
 * stores how long the person was active. The same rows drive the activity
 * timeline ("Signed in", "Signed out") and the usage metrics.
 */
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "./client";
import { activityLog, appUsers, userSessions } from "./schema";

export type SessionSource = "web" | "desktop";

export type SessionRow = {
  id: number;
  userId: number;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  source: string;
};

export type UserUsage = {
  userId: number;
  name: string;
  phone: string;
  role: string;
  sessions: number;
  /** Total active time in seconds. */
  activeSeconds: number;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  openSessions: number;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

/** Open a session for a user (called right after a successful sign-in). */
export async function startSession(
  db: Db,
  userId: number,
  source: SessionSource,
): Promise<number> {
  const [created] = await db
    .insert(userSessions)
    .values({ userId, source, startedAt: new Date() })
    .returning({ id: userSessions.id });
  await db.insert(activityLog).values({
    userId,
    actor: `user:${userId}`,
    event: "user.login",
    summary: `Signed in (${source})`,
    entity: "user",
    entityId: userId,
  });
  return created.id;
}

/**
 * Close the user's open session(s) and store the active time.
 * Returns the seconds the session lasted (0 when there was nothing to close).
 */
export async function endSession(db: Db, userId: number, source?: SessionSource): Promise<number> {
  const open = await db
    .select({
      id: userSessions.id,
      startedAt: userSessions.startedAt,
      source: userSessions.source,
    })
    .from(userSessions)
    .where(
      and(
        eq(userSessions.userId, userId),
        isNull(userSessions.endedAt),
        source ? eq(userSessions.source, source) : undefined,
      ),
    );

  let seconds = 0;
  for (const session of open) {
    const endedAt = new Date();
    const duration = Math.max(0, Math.round((endedAt.getTime() - new Date(session.startedAt).getTime()) / 1000));
    seconds += duration;
    await db
      .update(userSessions)
      .set({ endedAt, durationSeconds: duration })
      .where(eq(userSessions.id, session.id));
    await db.insert(activityLog).values({
      userId,
      actor: `user:${userId}`,
      event: "user.logout",
      summary: `Signed out after ${formatDuration(duration)}`,
      entity: "user",
      entityId: userId,
    });
  }
  return seconds;
}

/** "1h 5m" / "12m 30s" / "45s" */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${rest}s`;
  return `${rest}s`;
}

/** Recent sessions (newest first) — optional filter by user. */
export async function listSessions(db: Db, userId?: number, limit = 50): Promise<SessionRow[]> {
  const rows = await db
    .select({
      id: userSessions.id,
      userId: userSessions.userId,
      startedAt: userSessions.startedAt,
      endedAt: userSessions.endedAt,
      durationSeconds: userSessions.durationSeconds,
      source: userSessions.source,
    })
    .from(userSessions)
    .where(userId ? eq(userSessions.userId, userId) : undefined)
    .orderBy(desc(userSessions.startedAt), desc(userSessions.id))
    .limit(limit);
  return rows.map((row) => ({
    ...row,
    startedAt: iso(row.startedAt),
    endedAt: row.endedAt ? iso(row.endedAt) : null,
  }));
}

/** Usage metrics per user: sessions, active time, last login / logout. */
export async function userUsageMetrics(db: Db): Promise<UserUsage[]> {
  const rows = await db
    .select({
      userId: appUsers.id,
      name: appUsers.name,
      phone: appUsers.phone,
      role: appUsers.role,
      sessions: sql<number>`count(${userSessions.id})`.mapWith(Number),
      activeSeconds: sql<number>`coalesce(sum(${userSessions.durationSeconds}), 0)`.mapWith(Number),
      openSessions: sql<number>`count(${userSessions.id}) filter (where ${userSessions.endedAt} is null)`.mapWith(Number),
      lastLoginAt: sql<string | null>`max(${userSessions.startedAt})`.mapWith(String),
      lastLogoutAt: sql<string | null>`max(${userSessions.endedAt})`.mapWith(String),
    })
    .from(appUsers)
    .leftJoin(userSessions, eq(userSessions.userId, appUsers.id))
    .groupBy(appUsers.id)
    .orderBy(desc(sql`coalesce(sum(${userSessions.durationSeconds}), 0)`));

  return rows.map((row) => ({
    userId: row.userId,
    name: row.name,
    phone: row.phone,
    role: row.role,
    sessions: row.sessions,
    activeSeconds: row.activeSeconds,
    openSessions: row.openSessions,
    lastLoginAt: row.lastLoginAt ? iso(row.lastLoginAt) : null,
    lastLogoutAt: row.lastLogoutAt ? iso(row.lastLogoutAt) : null,
  }));
}
