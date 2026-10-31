/**
 * Costing for stock: the weighted-average (WAC) value pool of each item.
 *
 * Every item keeps a pool of two integers in `items`:
 *   stock_value_paise — value of the stock on hand (paise)
 *   avg_cost_paise    — average cost per display unit (paise per kg / l / pc)
 *
 * Purchases add to the pool (purchase expenses included), sales take from it,
 * usage and wastage reduce it. The average is always derived from the pool,
 * so the cost of a sale is exact (no rounding drift).
 *
 * The costing method is a setting: "WAC" (default) or "FIFO" (batch-wise).
 */
import { and, eq, sql } from "drizzle-orm";
import type { Db, TxDb } from "./client";
import { batches, items, settings } from "./schema";
import { baseFactor, type Unit } from "../logic/units";
import {
  addPurchaseToPool,
  avgCostPaise,
  poolFromBatches,
  takeFromPool,
  type CostPool,
} from "../logic/weightedCost";

export type CostingMethod = "WAC" | "FIFO";
export const COSTING_METHODS: CostingMethod[] = ["WAC", "FIFO"];
export const COSTING_SETTING_KEY = "costing_method";

/** Any handle that can run queries — plain db or a transaction. */
export type Queryable = Db | TxDb;

/** The costing method in force ("WAC" unless the shop changed it). */
export async function getCostingMethod(db: Queryable): Promise<CostingMethod> {
  const rows = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, COSTING_SETTING_KEY))
    .limit(1);
  const value = rows[0]?.value;
  return value === "FIFO" ? "FIFO" : "WAC";
}

/** Switch the costing method (Settings → Costing). */
export async function setCostingMethod(db: Queryable, method: CostingMethod): Promise<void> {
  await db
    .insert(settings)
    .values({ key: COSTING_SETTING_KEY, value: method })
    .onConflictDoUpdate({ target: settings.key, set: { value: method } });
}

/** The pool + average cost of one item. */
export async function getCostPool(db: Queryable, itemId: number): Promise<CostPool & { avgCostPaise: number }> {
  const [row] = await db
    .select({
      qtyBase: sql<number>`coalesce(sum(${batches.qtyRemaining}), 0)`.mapWith(Number),
      valuePaise: sql<number>`coalesce(${items.stockValuePaise}, 0)`.mapWith(Number),
      avgCostPaise: sql<number>`coalesce(${items.avgCostPaise}, 0)`.mapWith(Number),
    })
    .from(items)
    .leftJoin(batches, eq(batches.itemId, items.id))
    .where(eq(items.id, itemId))
    .groupBy(items.id);
  return { qtyBase: row?.qtyBase ?? 0, valuePaise: row?.valuePaise ?? 0, avgCostPaise: row?.avgCostPaise ?? 0 };
}

/** Write a pool back to the item (value + derived average). */
export async function saveCostPool(
  db: Queryable,
  itemId: number,
  pool: CostPool,
  unit: Unit,
): Promise<void> {
  await db
    .update(items)
    .set({
      stockValuePaise: pool.valuePaise,
      avgCostPaise: avgCostPaise(pool, baseFactor(unit)),
    })
    .where(eq(items.id, itemId));
}

/**
 * Add a purchase to the pool: value + purchase expenses, then the new average.
 * Returns the pool after the purchase.
 */
export async function addPurchaseToItemPool(
  db: Queryable,
  itemId: number,
  unit: Unit,
  qtyBase: number,
  unitPricePaise: number,
  expensesPaise: number,
): Promise<CostPool> {
  const current = await getCostPool(db, itemId);
  const factor = baseFactor(unit);
  const pool = addPurchaseToPool(
    { qtyBase: current.qtyBase, valuePaise: current.valuePaise },
    qtyBase,
    unitPricePaise,
    expensesPaise,
    factor,
  );
  await saveCostPool(db, itemId, pool, unit);
  return pool;
}

/**
 * Take stock out of the pool at the average cost (used by sales).
 * Returns the cost of goods sold in paise and the average cost snapshot.
 */
export async function takeFromItemPool(
  db: Queryable,
  itemId: number,
  unit: Unit,
  qtyBase: number,
): Promise<{ costPaise: number; avgCostPaise: number }> {
  const current = await getCostPool(db, itemId);
  const take = takeFromPool(
    { qtyBase: current.qtyBase, valuePaise: current.valuePaise },
    qtyBase,
    baseFactor(unit),
  );
  await saveCostPool(db, itemId, take.pool, unit);
  return { costPaise: take.costPaise, avgCostPaise: take.avgCostPaise };
}

/** Put stock back into the pool (sale cancelled). */
export async function returnToItemPool(
  db: Queryable,
  itemId: number,
  unit: Unit,
  qtyBase: number,
  costPaise: number,
): Promise<void> {
  const current = await getCostPool(db, itemId);
  await saveCostPool(
    db,
    itemId,
    { qtyBase: current.qtyBase + qtyBase, valuePaise: current.valuePaise + costPaise },
    unit,
  );
}

/**
 * Rebuild every pool from the open batches — one-off backfill after the switch
 * to weighted average, and a repair tool.
 */
export async function rebuildAllCostPools(db: Queryable): Promise<number> {
  const rows = await db
    .select({ id: items.id, unit: items.unit })
    .from(items);
  let updated = 0;
  for (const item of rows) {
    const open = await db
      .select({ qtyRemaining: batches.qtyRemaining, unitPricePaise: batches.unitPricePaise })
      .from(batches)
      .where(and(eq(batches.itemId, item.id), sql`${batches.qtyRemaining} > 0`));
    const pool = poolFromBatches(open, baseFactor(item.unit as Unit));
    await saveCostPool(db, item.id, pool, item.unit as Unit);
    updated += 1;
  }
  return updated;
}
