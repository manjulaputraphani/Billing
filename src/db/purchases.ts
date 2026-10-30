import { asc, desc, eq, gte, lte, and, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./client";
import { batches, items, purchases, suppliers } from "./schema";
import { costPaise, toBase, type Unit } from "../logic/units";

export const PAYMENT_MODES = ["Cash", "UPI", "Card", "Credit"] as const;

export const purchaseInputSchema = z.object({
  itemId: z.number({ message: "Choose an item" }).int().positive("Choose an item"),
  supplierName: z.string().trim().max(80, "Supplier name is too long").optional(),
  qty: z
    .number({ message: "Quantity is required" })
    .positive("Quantity must be more than 0"),
  unitPricePaise: z
    .number({ message: "Price is required" })
    .int("Price must be whole paise")
    .min(0, "Price cannot be negative"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
  paymentMode: z.enum(PAYMENT_MODES).optional(),
  note: z.string().trim().max(200, "Note is too long").optional(),
});

export type PurchaseInput = z.infer<typeof purchaseInputSchema>;

export function parsePurchaseInput(input: unknown): PurchaseInput {
  const result = purchaseInputSchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid purchase");
  }
  return result.data;
}

export type AddPurchaseResult = {
  purchaseId: number;
  batchId: number;
  movementId: number;
  qtyBase: number;
  totalPaise: number;
};

function rowsOf<T>(result: unknown): T[] {
  const r = result as { rows?: T[] };
  return r.rows ?? (result as T[]);
}

/**
 * Insert purchase + batch + PURCHASE movement as ONE statement (CTEs), so the
 * three rows exist together or not at all. Supplier is found by name or created.
 */
export async function addPurchase(db: Db, input: unknown): Promise<AddPurchaseResult> {
  const data = parsePurchaseInput(input);

  const [item] = await db
    .select({ id: items.id, unit: items.unit })
    .from(items)
    .where(eq(items.id, data.itemId));
  if (!item) throw new Error("Item not found");

  const unit = item.unit as Unit;
  const qtyBase = toBase(data.qty, unit);
  if (qtyBase <= 0) throw new Error("Quantity is too small");
  const totalPaise = costPaise(qtyBase, data.unitPricePaise, unit);

  const supplier = data.supplierName?.trim() || null;
  const note = data.note?.trim() || null;
  const paymentMode = data.paymentMode ?? null;

  const result = await db.execute(sql`
    WITH new_supplier AS (
      INSERT INTO suppliers (name)
      SELECT ${supplier}::text
      WHERE ${supplier}::text IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM suppliers WHERE lower(name) = lower(${supplier}::text))
      RETURNING id
    ),
    supplier_id AS (
      SELECT id FROM new_supplier
      UNION ALL
      SELECT id FROM suppliers WHERE lower(name) = lower(${supplier}::text)
      LIMIT 1
    ),
    p AS (
      INSERT INTO purchases
        (item_id, supplier_id, qty_base, unit_price_paise, total_paise, purchase_date, payment_mode, note)
      SELECT
        ${data.itemId}::int, (SELECT id FROM supplier_id), ${qtyBase}::int,
        ${data.unitPricePaise}::int, ${totalPaise}::int, ${data.date}::date,
        ${paymentMode}::text, ${note}::text
      RETURNING id, item_id, qty_base, unit_price_paise, total_paise, purchase_date
    ),
    b AS (
      INSERT INTO batches
        (purchase_id, item_id, qty_original, qty_remaining, unit_price_paise, purchase_date)
      SELECT id, item_id, qty_base, qty_base, unit_price_paise, purchase_date FROM p
      RETURNING id
    ),
    m AS (
      INSERT INTO stock_movements
        (item_id, type, qty_change, cost_paise, movement_date, note)
      SELECT item_id, 'PURCHASE', qty_base, total_paise, purchase_date, ${note}::text FROM p
      RETURNING id
    )
    SELECT p.id AS purchase_id, b.id AS batch_id, m.id AS movement_id
    FROM p, b, m
  `);

  const row = rowsOf<{ purchase_id: number; batch_id: number; movement_id: number }>(result)[0];
  if (!row) throw new Error("Purchase was not saved");

  return {
    purchaseId: Number(row.purchase_id),
    batchId: Number(row.batch_id),
    movementId: Number(row.movement_id),
    qtyBase,
    totalPaise,
  };
}

/** Most recent purchase for an item — used to prefill the price field. */
export async function getLastPurchase(
  db: Db,
  itemId: number,
): Promise<{ unitPricePaise: number; date: string } | null> {
  const rows = await db
    .select({ unitPricePaise: purchases.unitPricePaise, date: purchases.purchaseDate })
    .from(purchases)
    .where(eq(purchases.itemId, itemId))
    .orderBy(desc(purchases.purchaseDate), desc(purchases.id))
    .limit(1);
  return rows[0] ?? null;
}

/** Supplier names for the autocomplete list. */
export async function listSuppliers(db: Db): Promise<string[]> {
  const rows = await db
    .select({ name: suppliers.name })
    .from(suppliers)
    .orderBy(asc(suppliers.name));
  return rows.map((r) => r.name);
}

export type PurchaseListRow = {
  id: number;
  date: string;
  itemId: number;
  itemName: string;
  unit: string;
  qtyBase: number;
  unitPricePaise: number;
  totalPaise: number;
  supplier: string | null;
  qtyRemaining: number;
};

/** Purchases, newest first, optionally filtered by item and date range. */
export async function listPurchases(
  db: Db,
  filter: { itemId?: number; from?: string; to?: string } = {},
): Promise<PurchaseListRow[]> {
  const conditions = [
    filter.itemId ? eq(purchases.itemId, filter.itemId) : undefined,
    filter.from ? gte(purchases.purchaseDate, filter.from) : undefined,
    filter.to ? lte(purchases.purchaseDate, filter.to) : undefined,
  ].filter(Boolean);

  const rows = await db
    .select({
      id: purchases.id,
      date: purchases.purchaseDate,
      itemId: purchases.itemId,
      itemName: items.name,
      unit: items.unit,
      qtyBase: purchases.qtyBase,
      unitPricePaise: purchases.unitPricePaise,
      totalPaise: purchases.totalPaise,
      supplier: suppliers.name,
      qtyRemaining: batches.qtyRemaining,
    })
    .from(purchases)
    .innerJoin(items, eq(items.id, purchases.itemId))
    .leftJoin(suppliers, eq(suppliers.id, purchases.supplierId))
    .leftJoin(batches, eq(batches.purchaseId, purchases.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(purchases.purchaseDate), desc(purchases.id));

  return rows.map((r) => ({ ...r, qtyRemaining: r.qtyRemaining ?? 0 }));
}
