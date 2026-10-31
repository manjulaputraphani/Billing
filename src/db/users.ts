import { asc, eq, sql } from "drizzle-orm";
import type { Db } from "./client";
import { appUsers } from "./schema";
import { hashPassword } from "../lib/secrets";
import { logActivity } from "./activity";
import { normalizePhone, validatePassword } from "../logic/auth";
import type { Role } from "../logic/permissions";

export type AppUser = {
  id: number;
  name: string;
  phone: string;
  role: Role;
  active: boolean;
  pending: boolean;
  accessUntil: string | null;
};

export type AppUserWithHash = AppUser & { passwordHash: string };

function asRole(value: string): Role {
  return value === "owner" ? "owner" : value === "ca" ? "ca" : "staff";
}

export async function countUsers(db: Db): Promise<number> {
  const rows = await db.select({ id: appUsers.id }).from(appUsers);
  return rows.length;
}

export async function findUserByPhone(db: Db, phone: string): Promise<AppUserWithHash | null> {
  const normalized = normalizePhone(phone).phone;
  if (!normalized) return null;
  const [row] = await db
    .select({
      id: appUsers.id,
      name: appUsers.name,
      phone: appUsers.phone,
      role: appUsers.role,
      active: appUsers.active,
      pending: appUsers.pending,
      accessUntil: appUsers.accessUntil,
      passwordHash: appUsers.passwordHash,
    })
    .from(appUsers)
    .where(eq(appUsers.phone, normalized))
    .limit(1);
  return row ? { ...row, role: asRole(row.role) } : null;
}

export async function createUser(
  db: Db,
  input: { name: string; phone: string; password: string; role?: Role; accessUntil?: string | null },
): Promise<AppUser> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  const phone = normalizePhone(input.phone);
  if (!phone.valid) throw new Error(phone.reason ?? "Invalid phone number");
  const password = validatePassword(input.password);
  if (!password.valid) throw new Error(password.reason ?? "Invalid password");

  const existing = await findUserByPhone(db, phone.phone);
  if (existing) throw new Error("That phone number already has an account");

  const role = input.role ?? "staff";
  const accessUntil = input.accessUntil && /^\d{4}-\d{2}-\d{2}$/.test(input.accessUntil) ? input.accessUntil : null;
  const [created] = await db
    .insert(appUsers)
    .values({
      name,
      phone: phone.phone,
      passwordHash: await hashPassword(input.password),
      role,
      accessUntil,
    })
    .returning({
      id: appUsers.id,
      name: appUsers.name,
      phone: appUsers.phone,
      role: appUsers.role,
      active: appUsers.active,
      pending: appUsers.pending,
      accessUntil: appUsers.accessUntil,
    });

  await logActivity(db, {
    event: "user.create",
    summary: `Member added: ${name} (${role})${accessUntil ? ` until ${accessUntil}` : ""}`,
    entity: "user",
    entityId: created.id,
  });

  return { ...created, role: asRole(created.role) };
}

export async function listAppUsers(db: Db): Promise<AppUser[]> {
  // Access-until is enforced lazily: expired accounts become inactive.
  await db.execute(
    sql`update app_users set active = false where access_until is not null and access_until < current_date and active = true`,
  );
  const rows = await db
    .select({
      id: appUsers.id,
      name: appUsers.name,
      phone: appUsers.phone,
      role: appUsers.role,
      active: appUsers.active,
      pending: appUsers.pending,
      accessUntil: appUsers.accessUntil,
    })
    .from(appUsers)
    .orderBy(asc(appUsers.id));
  return rows.map((row) => ({ ...row, role: asRole(row.role) }));
}

export async function resetUserPassword(db: Db, userId: number, password: string): Promise<void> {
  const check = validatePassword(password);
  if (!check.valid) throw new Error(check.reason ?? "Invalid password");
  await db
    .update(appUsers)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(appUsers.id, userId));
  await logActivity(db, {
    event: "user.password",
    summary: `Password reset for member #${userId}`,
    entity: "user",
    entityId: userId,
  });
}

async function otherActiveOwners(db: Db, excludeUserId: number): Promise<number> {
  const rows = await db.select({ id: appUsers.id, role: appUsers.role, active: appUsers.active }).from(appUsers);
  return rows.filter((row) => row.id !== excludeUserId && row.role === "owner" && row.active).length;
}

export async function setUserRole(db: Db, userId: number, role: Role): Promise<void> {
  const [target] = await db
    .select({ role: appUsers.role, active: appUsers.active })
    .from(appUsers)
    .where(eq(appUsers.id, userId))
    .limit(1);
  if (!target) throw new Error("Member not found");
  if (target.role === "owner" && role !== "owner" && target.active) {
    if ((await otherActiveOwners(db, userId)) === 0) {
      throw new Error("At least one active Owner is required");
    }
  }
  await db.update(appUsers).set({ role }).where(eq(appUsers.id, userId));
  await logActivity(db, {
    event: "user.role",
    summary: `Member #${userId} role set to ${role}`,
    entity: "user",
    entityId: userId,
  });
}

export async function setUserActive(db: Db, userId: number, active: boolean): Promise<void> {
  if (!active) {
    const [target] = await db
      .select({ role: appUsers.role, active: appUsers.active })
      .from(appUsers)
      .where(eq(appUsers.id, userId))
      .limit(1);
    if (!target) throw new Error("Member not found");
    if (target.role === "owner" && target.active && (await otherActiveOwners(db, userId)) === 0) {
      throw new Error("At least one active Owner is required");
    }
  }
  await db.update(appUsers).set({ active }).where(eq(appUsers.id, userId));
  await logActivity(db, {
    event: active ? "user.enable" : "user.disable",
    summary: `Member #${userId} ${active ? "enabled" : "disabled"}`,
    entity: "user",
    entityId: userId,
  });
}
