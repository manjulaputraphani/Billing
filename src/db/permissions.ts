/**
 * Read/write the role → module → permission matrix.
 *
 * The table stores one row per role+module. Missing rows fall back to the
 * built-in defaults, so a fresh database (or a newly added module) still has
 * sensible permissions.
 */
import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { rolePermissions } from "./schema";
import { logActivity } from "./activity";
import {
  DEFAULT_ROLE_PERMISSIONS,
  MODULES,
  ROLES,
  ownerPermissions,
  type ModuleKey,
  type PermissionSet,
  type Role,
  type RolePermissions,
} from "../logic/permissions";

type Row = {
  role: string;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
};

function setFromRow(row: Row): PermissionSet {
  return {
    view: row.canView,
    create: row.canCreate,
    edit: row.canEdit,
    delete: row.canDelete,
    export: row.canExport,
  };
}

function roleMatrix(role: Role, rows: Row[]): RolePermissions {
  if (role === "owner") return ownerPermissions();
  const defaults = DEFAULT_ROLE_PERMISSIONS[role];
  const result = {} as RolePermissions;
  for (const moduleKey of MODULES) {
    const row = rows.find((entry) => entry.role === role && entry.module === moduleKey);
    result[moduleKey] = row ? setFromRow(row) : { ...defaults[moduleKey] };
  }
  return result;
}

/** The full matrix for all three roles (used by Team → Roles & permissions). */
export async function getRoleMatrix(db: Db): Promise<Record<Role, RolePermissions>> {
  const rows = (await db.select().from(rolePermissions)) as Row[];
  const result = {} as Record<Role, RolePermissions>;
  for (const role of ROLES) result[role] = roleMatrix(role, rows);
  return result;
}

/** Permissions for one role (Owner is always all-true). */
export async function loadPermissionsForRole(db: Db, role: Role): Promise<RolePermissions> {
  if (role === "owner") return ownerPermissions();
  const rows = (await db
    .select()
    .from(rolePermissions)
    .where(eq(rolePermissions.role, role))) as Row[];
  return roleMatrix(role, rows);
}

/** Save a role matrix. Owner is immutable. Returns the saved matrix. */
export async function saveRolePermissions(
  db: Db,
  role: Role,
  input: RolePermissions,
): Promise<RolePermissions> {
  if (role === "owner") throw new Error("Owner permissions cannot be changed");

  const before = await loadPermissionsForRole(db, role);
  const changed: ModuleKey[] = [];

  for (const moduleKey of MODULES) {
    const next = input[moduleKey];
    if (!next) continue;
    const current = before[moduleKey];
    if (
      current.view === next.view &&
      current.create === next.create &&
      current.edit === next.edit &&
      current.delete === next.delete &&
      current.export === next.export
    ) {
      continue;
    }
    changed.push(moduleKey);
    await db
      .insert(rolePermissions)
      .values({
        role,
        module: moduleKey,
        canView: Boolean(next.view),
        canCreate: Boolean(next.create),
        canEdit: Boolean(next.edit),
        canDelete: Boolean(next.delete),
        canExport: Boolean(next.export),
      })
      .onConflictDoUpdate({
        target: [rolePermissions.role, rolePermissions.module],
        set: {
          canView: Boolean(next.view),
          canCreate: Boolean(next.create),
          canEdit: Boolean(next.edit),
          canDelete: Boolean(next.delete),
          canExport: Boolean(next.export),
        },
      });
  }

  if (changed.length > 0) {
    await logActivity(db, {
      event: "permissions.update",
      summary: `${role.toUpperCase()} permissions updated: ${changed.join(", ")}`,
      entity: "role",
    });
  }

  return loadPermissionsForRole(db, role);
}

/** Make sure every role has a row for every module (used by the DB seed). */
export function defaultRows(): Array<Row> {
  const rows: Array<Row> = [];
  for (const role of ROLES) {
    const matrix = DEFAULT_ROLE_PERMISSIONS[role];
    for (const moduleKey of MODULES) {
      const set = matrix[moduleKey];
      rows.push({
        role,
        module: moduleKey,
        canView: set.view,
        canCreate: set.create,
        canEdit: set.edit,
        canDelete: set.delete,
        canExport: set.export,
      });
    }
  }
  return rows;
}
