import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./client";
import { expenses } from "./schema";
import { PAYMENT_MODES } from "./purchases";

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Electricity",
  "Transport",
  "Salary",
  "Packaging",
  "Maintenance",
  "Other",
] as const;

export const expenseInputSchema = z.object({
  category: z.string().trim().min(1, "Category is required").max(60, "Category is too long"),
  amountPaise: z
    .number({ message: "Amount is required" })
    .int("Amount must be whole paise")
    .positive("Amount must be more than 0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
  paymentMode: z.enum(PAYMENT_MODES).optional(),
  note: z.string().trim().max(200, "Note is too long").optional(),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export type ExpenseRow = {
  id: number;
  category: string;
  amountPaise: number;
  date: string;
  paymentMode: string | null;
  note: string | null;
};

export function parseExpenseInput(input: unknown): ExpenseInput {
  const result = expenseInputSchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid expense");
  }
  return result.data;
}

/** "2026-10" → ["2026-10-01", "2026-11-01") */
export function monthRange(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber, 1));
  return { start: `${month}-01`, end: next.toISOString().slice(0, 10) };
}

export async function listExpenses(
  db: Db,
  filter: { month?: string; category?: string } = {},
): Promise<ExpenseRow[]> {
  const conditions = [];
  if (filter.month) {
    const { start, end } = monthRange(filter.month);
    conditions.push(gte(expenses.expenseDate, start), lt(expenses.expenseDate, end));
  }
  if (filter.category) {
    conditions.push(eq(expenses.category, filter.category));
  }

  return db
    .select({
      id: expenses.id,
      category: expenses.category,
      amountPaise: expenses.amountPaise,
      date: expenses.expenseDate,
      paymentMode: expenses.paymentMode,
      note: expenses.note,
    })
    .from(expenses)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(expenses.expenseDate), desc(expenses.id));
}

export async function createExpense(db: Db, input: unknown): Promise<ExpenseRow> {
  const data = parseExpenseInput(input);
  const [created] = await db
    .insert(expenses)
    .values({
      category: data.category,
      amountPaise: data.amountPaise,
      expenseDate: data.date,
      paymentMode: data.paymentMode ?? null,
      note: data.note?.trim() || null,
    })
    .returning();
  return {
    id: created.id,
    category: created.category,
    amountPaise: created.amountPaise,
    date: created.expenseDate,
    paymentMode: created.paymentMode,
    note: created.note,
  };
}

export async function updateExpense(db: Db, id: number, input: unknown): Promise<ExpenseRow> {
  const data = parseExpenseInput(input);
  const [updated] = await db
    .update(expenses)
    .set({
      category: data.category,
      amountPaise: data.amountPaise,
      expenseDate: data.date,
      paymentMode: data.paymentMode ?? null,
      note: data.note?.trim() || null,
    })
    .where(eq(expenses.id, id))
    .returning();
  if (!updated) throw new Error("Expense not found");
  return {
    id: updated.id,
    category: updated.category,
    amountPaise: updated.amountPaise,
    date: updated.expenseDate,
    paymentMode: updated.paymentMode,
    note: updated.note,
  };
}

export async function deleteExpense(db: Db, id: number): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id));
}

/** Categories already used, for the dropdown, oldest first. */
export async function listExpenseCategories(db: Db): Promise<string[]> {
  const rows = await db
    .selectDistinct({ category: expenses.category })
    .from(expenses)
    .orderBy(asc(expenses.category));
  return rows.map((r) => r.category);
}
