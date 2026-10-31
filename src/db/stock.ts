import { and, asc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { withTransaction } from "./client";
import { batches, items, movementBatchLinks, stockMovements } from "./schema";import { allocateFifo } from "../logic/fifo";
import { computeUsage } from "../logic/stockCheck";
import { baseFactor, formatQuantity, type Unit } from "../logic/units";
import { takeFromPool } from "../logic/weightedCost";
import { getCostingMethod, getCostPool, saveCostPool } from "./costing";
import { logActivity } from "./activity";
import type { Db } from "./client";

export const STOCK_ENTRY_TYPES = ["STOCK_CHECK", "USAGE", "WASTAGE"] as const;
export type StockEntryType = (typeof STOCK_ENTRY_TYPES)[number];

export const stockEntrySchema = z
  .object({
    itemId: z.number({ message: "Choose an item" }).int().positive("Choose an item"),
    type: z.enum(STOCK_ENTRY_TYPES),
    enteredLeft: z.number().int().nonnegative().nullish(),
    qty: z.number().int().positive().nullish(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
    note: z.string().trim().max(200, "Note is too long").optional(),
  })
  .refine((v) => (v.type === "STOCK_CHECK" ? v.enteredLeft != null : v.qty != null), {
    message: "Enter a quantity",
  });

export type StockEntryInput = z.infer<typeof stockEntrySchema>;

export function parseStockEntry(input: unknown): StockEntryInput {
  const result = stockEntrySchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid entry");
  }
  return result.data;
}

export type OpenBatch = {
  id: number;
  qtyRemaining: number;
  unitPricePaise: number;
  purchaseDate: string;
};

/** Batches that still have stock, oldest first. */
export async function listOpenBatches(db: Db, itemId: number): Promise<OpenBatch[]> {
  return db
    .select({
      id: batches.id,
      qtyRemaining: batches.qtyRemaining,
      unitPricePaise: batches.unitPricePaise,
      purchaseDate: batches.purchaseDate,
    })
    .from(batches)
    .where(and(eq(batches.itemId, itemId), gt(batches.qtyRemaining, 0)))
    .orderBy(asc(batches.purchaseDate), asc(batches.id));
}

export type StockPlan = {
  used: number;
  takes: { batchId: number; qty: number; unitPricePaise: number; costPaise: number }[];
  totalCostPaise: number;
  remaining: { id: number; qtyRemaining: number }[];
  leftQty: number;
  leftValuePaise: number;
};

/**
 * Pure preview of a stock entry: what gets used, from which batches, and what
 * is left. The save path uses exactly this, so preview and result cannot drift.
 */
export function planStockEntry(
  openBatches: readonly OpenBatch[],
  entry: { type: StockEntryType; enteredLeft?: number | null; qty?: number | null },
  factor: number,
): StockPlan {
  const current = openBatches.reduce((sum, b) => sum + b.qtyRemaining, 0);

  const used =
    entry.type === "STOCK_CHECK"
      ? computeUsage(current, entry.enteredLeft ?? 0)
      : (entry.qty ?? 0);

  const allocation = allocateFifo(openBatches, used, factor);
  const takenByBatch = new Map(allocation.takes.map((t) => [t.batchId, t.qty]));

  const remaining = openBatches.map((b) => ({
    id: b.id,
    qtyRemaining: b.qtyRemaining - (takenByBatch.get(b.id) ?? 0),
  }));

  const leftValuePaise = remaining.reduce((sum, r, index) => {
    const price = openBatches[index]?.unitPricePaise ?? 0;
    return sum + Math.round((r.qtyRemaining * price) / factor);
  }, 0);

  return {
    used,
    takes: allocation.takes,
    totalCostPaise: allocation.totalCostPaise,
    remaining,
    leftQty: remaining.reduce((sum, r) => sum + r.qtyRemaining, 0),
    leftValuePaise,
  };
}

export type StockSaveResult = {
  movementId: number;
  used: number;
  costPaise: number;
};

/** Save a stock check / usage / wastage entry as ONE transaction. */
export async function saveStockEntry(url: string, input: unknown): Promise<StockSaveResult> {
  const data = parseStockEntry(input);

  return withTransaction(url, async (tx) => {
    const [item] = await tx
      .select({ id: items.id, unit: items.unit })
      .from(items)
      .where(eq(items.id, data.itemId));
    if (!item) throw new Error("Item not found");

    const factor = baseFactor(item.unit as Unit);

    // Lock the rows for this item so two entries cannot double-spend a batch.
    const open = await tx
      .select({
        id: batches.id,
        qtyRemaining: batches.qtyRemaining,
        unitPricePaise: batches.unitPricePaise,
        purchaseDate: batches.purchaseDate,
      })
      .from(batches)
      .where(and(eq(batches.itemId, data.itemId), gt(batches.qtyRemaining, 0)))
      .orderBy(asc(batches.purchaseDate), asc(batches.id))
      .for("update");

    const plan = planStockEntry(open, data, factor);

    // Value pool BEFORE the batches are reduced (stock on hand before this entry).
    const costing = await getCostingMethod(tx);
    const poolBefore = costing === "WAC" ? await getCostPool(tx, data.itemId) : null;

    for (const row of plan.remaining) {
      const before = open.find((b) => b.id === row.id)?.qtyRemaining;
      if (before !== row.qtyRemaining) {
        await tx.update(batches).set({ qtyRemaining: row.qtyRemaining }).where(eq(batches.id, row.id));
      }
    }

    // Usage / wastage / stock-check removes stock, so the pool loses that value.
    let costPaise = plan.totalCostPaise;
    if (poolBefore && plan.used > 0) {
      const take = takeFromPool(
        { qtyBase: poolBefore.qtyBase, valuePaise: poolBefore.valuePaise },
        plan.used,
        factor,
      );
      costPaise = take.costPaise;
      await saveCostPool(tx, data.itemId, take.pool, item.unit as Unit);
    }

    const [movement] = await tx
      .insert(stockMovements)
      .values({
        itemId: data.itemId,
        type: data.type,
        qtyChange: -plan.used,
        costPaise,
        enteredQtyLeft: data.type === "STOCK_CHECK" ? (data.enteredLeft ?? null) : null,
        movementDate: data.date,
        note: data.note?.trim() || null,
      })
      .returning({ id: stockMovements.id });

    if (plan.takes.length > 0) {
      await tx.insert(movementBatchLinks).values(
        plan.takes.map((take) => ({
          movementId: movement.id,
          batchId: take.batchId,
          qtyTaken: take.qty,
          unitPricePaise: take.unitPricePaise,
          costPaise: take.costPaise,
        })),
      );
    }

    await logActivity(tx, {
      event: `stock.${data.type.toLowerCase()}`,
      summary: `${data.type === "STOCK_CHECK" ? "Stock check" : data.type === "USAGE" ? "Used" : "Wastage"}: ${formatQuantity(
        plan.used,
        item.unit as Unit,
      )}`,
      entity: "item",
      entityId: data.itemId,
    });

    return { movementId: movement.id, used: plan.used, costPaise };
  });
}

/** Convenience wrapper for the stock-check flow. */
export function stockCheck(
  url: string,
  input: { itemId: number; enteredLeft: number; date: string; note?: string },
): Promise<StockSaveResult> {
  return saveStockEntry(url, { ...input, type: "STOCK_CHECK" });
}
