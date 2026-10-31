/**
 * Role permission storage against the real schema (needs DATABASE_URL_TEST).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { resetAll, setupTestDb } from "./test-utils";
import { getRoleMatrix, loadPermissionsForRole, saveRolePermissions } from "./permissions";
import { activityLog } from "./schema";
import { DEFAULT_ROLE_PERMISSIONS } from "../logic/permissions";

const db = await setupTestDb();
const suite = db ? describe : describe.skip;

suite("role permissions — defaults, save, reload", () => {
  beforeEach(async () => {
    if (db) await resetAll(db);
  });

  it(
    "returns defaults, saves CA changes and protects the owner",
    { timeout: 30_000 },
    async () => {
      if (!db) return;

      const before = await getRoleMatrix(db);
      expect(before.ca.expenses.view).toBe(true);
      expect(before.ca.billing.view).toBe(false);
      expect(before.owner.team.delete).toBe(true);

      const next = structuredClone(DEFAULT_ROLE_PERMISSIONS.ca);
      next.billing = { view: true, create: true, edit: false, delete: false, export: false };

      const saved = await saveRolePermissions(db, "ca", next);
      expect(saved.billing.view).toBe(true);
      expect(saved.billing.create).toBe(true);

      const reloaded = await loadPermissionsForRole(db, "ca");
      expect(reloaded.billing.create).toBe(true);

      const logs = await db.select().from(activityLog);
      expect(logs.some((entry) => entry.event === "permissions.update")).toBe(true);

      await expect(
        saveRolePermissions(db, "owner", next),
      ).rejects.toThrow("Owner permissions cannot be changed");
    },
  );
});
