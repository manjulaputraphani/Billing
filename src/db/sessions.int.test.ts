/**
 * Login sessions and usage metrics against the real schema.
 * Needs DATABASE_URL_TEST — the suite skips otherwise.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { resetAll, setupTestDb } from "./test-utils";
import { endSession, formatDuration, listSessions, startSession, userUsageMetrics } from "./sessions";
import { activityLog, appUsers, userSessions } from "./schema";

const db = await setupTestDb();
const suite = db ? describe : describe.skip;

suite("login sessions + usage metrics", () => {
  beforeEach(async () => {
    if (db) await resetAll(db);
  });

  it(
    "opens, closes and reports a session",
    { timeout: 30_000 },
    async () => {
      const [user] = await db!
        .insert(appUsers)
        .values({ name: "Owner", phone: "9000000001", passwordHash: "x", role: "owner" })
        .returning();

      const sessionId = await startSession(db!, user.id, "web");

      const open = await db!.select().from(userSessions).where(eq(userSessions.id, sessionId));
      expect(open[0].endedAt).toBeNull();
      expect(open[0].source).toBe("web");

      // The activity timeline knows about the sign-in.
      const logins = await db!.select().from(activityLog).where(eq(activityLog.event, "user.login"));
      expect(logins).toHaveLength(1);
      expect(logins[0].userId).toBe(user.id);

      const seconds = await endSession(db!, user.id, "web");
      expect(seconds).toBeGreaterThanOrEqual(0);

      const closed = await db!.select().from(userSessions).where(eq(userSessions.id, sessionId));
      expect(closed[0].endedAt).not.toBeNull();
      expect(closed[0].durationSeconds).not.toBeNull();

      const usage = await userUsageMetrics(db!);
      expect(usage).toHaveLength(1);
      expect(usage[0].sessions).toBe(1);
      expect(usage[0].openSessions).toBe(0);
      expect(usage[0].lastLoginAt).toBeTruthy();
      expect(usage[0].lastLogoutAt).toBeTruthy();

      expect(await listSessions(db!, user.id)).toHaveLength(1);
      expect(formatDuration(usage[0].activeSeconds)).toMatch(/s$/);
    },
  );
});
