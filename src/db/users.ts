import { asc, eq } from "drizzle-orm";
import type { Db } from "./client";
import { appUsers } from "./schema";
import { hashPassword } from "../lib/secrets";
import { logActivity } from "./activity";
import { normalizePhone, validatePassword } from "../logic/auth";

export type AppUser = {
  id: number;
  name: string;
  phone: string;
  role: "owner" | "staff";
  active: boolean;
  pending: boolean;
};

export type AppUserWithHash = AppUser & { passwordHash: string };

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
      passwordHash: appUsers.passwordHash,
    })
    .from(appUsers)
    .where(eq(appUsers.phone, normalized))
    .limit(1);
  return row ? { ...row, role: row.role === "owner" ? "owner" : "staff" } : null;
}

export async function createUser(
  db: Db,
  input: { name: string; phone: string; password: string; role?: "owner" | "staff" },
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
  const [created] = await db
    .insert(appUsers)
    .values({
      name,
      phone: phone.phone,
      passwordHash: await hashPassword(input.password),
      role,
    })
    .returning({
      id: appUsers.id,
      name: appUsers.name,
      phone: appUsers.phone,
      role: appUsers.role,
      active: appUsers.active,
    });

  await logActivity(db, {
    event: "user.create",
    summary: `Member added: ${name} (${role})`,
    entity: "user",
    entityId: created.id,
  });

  return { ...created, role: created.role === "owner" ? "owner" : "staff" };
}

export async function listAppUsers(db: Db): Promise<AppUser[]> {
  const rows = await db
    .select({
      id: appUsers.id,
      name: appUsers.name,
      phone: appUsers.phone,
      role: appUsers.role,
      active: appUsers.active,
      pending: appUsers.pending,
    })
    .from(appUsers)
    .orderBy(asc(appUsers.id));
  return rows.map((row) => ({ ...row, role: row.role === "owner" ? "owner" : "staff" }));
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

export async function setUserActive(db: Db, userId: number, active: boolean): Promise<void> {
  await db.update(appUsers).set({ active }).where(eq(appUsers.id, userId));
  await logActivity(db, {
    event: active ? "user.enable" : "user.disable",
    summary: `Member #${userId} ${active ? "enabled" : "disabled"}`,
    entity: "user",
    entityId: userId,
  });
}
