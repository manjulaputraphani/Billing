/**
 * Weighted-average costing (WAC) — the value pool of one item.
 *
 * The pool keeps two integers:
 *   qtyBase    — stock on hand in base units (g, ml, pcs)
 *   valuePaise — total value of that stock in paise
 *
 * The average cost is derived from the pool (never stored as the source of
 * truth), so the arithmetic stays exact:
 *
 *   buy 100 kg @ ₹100          → pool {100 000 g, 1 000 000 paise}
 *   buy 200 kg @ ₹102 + ₹300   → pool {300 000 g, 3 070 000 paise}  → ₹102.33/kg
 *   sell 20 kg @ ₹110          → COGS = 3 070 000 × 20 000 / 300 000 = ₹2 046.67
 *                                 gross = ₹2 200 − ₹2 046.67 = ₹153.33
 *
 * Pure, no DB, no floats for money.
 */

import { baseFactor, type Unit } from "./units";

export type CostPool = {
  /** Stock on hand in base units. */
  qtyBase: number;
  /** Value of that stock in paise. */
  valuePaise: number;
};

/** Value of `qtyBase` base units at `unitPricePaise` per display unit. */
export function purchaseValuePaise(
  qtyBase: number,
  unitPricePaise: number,
  factor: number,
): number {
  if (!Number.isInteger(qtyBase) || qtyBase < 0) throw new Error(`Invalid quantity: ${qtyBase}`);
  if (!Number.isInteger(unitPricePaise) || unitPricePaise < 0) {
    throw new Error(`Invalid price: ${unitPricePaise}`);
  }
  if (factor <= 0) throw new Error(`Invalid factor: ${factor}`);
  return Math.round((qtyBase * unitPricePaise) / factor);
}

/**
 * Add a purchase to the pool. Purchase expenses (transport, loading,
 * commission) are added into the stock cost, so they raise the average.
 */
export function addPurchaseToPool(
  pool: CostPool,
  qtyBase: number,
  unitPricePaise: number,
  expensesPaise: number,
  factor: number,
): CostPool {
  const value = purchaseValuePaise(qtyBase, unitPricePaise, factor) + Math.max(0, expensesPaise);
  return { qtyBase: pool.qtyBase + qtyBase, valuePaise: pool.valuePaise + value };
}

/** Average cost in paise per display unit (₹102.33 → 10233 for kg). */
export function avgCostPaise(pool: CostPool, factor: number): number {
  if (factor <= 0) throw new Error(`Invalid factor: ${factor}`);
  if (pool.qtyBase <= 0) return 0;
  return Math.round((pool.valuePaise * factor) / pool.qtyBase);
}

/** Average cost per display unit for an item unit ("kg" → 1000). */
export function avgCostForUnit(pool: CostPool, unit: Unit): number {
  return avgCostPaise(pool, baseFactor(unit));
}

export type PoolTake = {
  /** Cost of goods sold for the quantity taken (paise). */
  costPaise: number;
  /** The pool after the take. */
  pool: CostPool;
  /** Average cost per display unit at the moment of the sale. */
  avgCostPaise: number;
};

/**
 * Take `qtyBase` out of the pool at the current average cost.
 * The cost of the whole pool is taken when the pool runs out.
 */
export function takeFromPool(pool: CostPool, qtyBase: number, factor: number): PoolTake {
  if (!Number.isInteger(qtyBase) || qtyBase < 0) throw new Error(`Invalid quantity: ${qtyBase}`);
  if (factor <= 0) throw new Error(`Invalid factor: ${factor}`);
  const avg = avgCostPaise(pool, factor);
  if (pool.qtyBase <= 0 || qtyBase === 0) {
    return { costPaise: 0, pool: { ...pool }, avgCostPaise: avg };
  }
  if (qtyBase >= pool.qtyBase) {
    // Selling everything: the whole remaining value leaves the pool.
    return { costPaise: pool.valuePaise, pool: { qtyBase: 0, valuePaise: 0 }, avgCostPaise: avg };
  }
  const costPaise = Math.round((pool.valuePaise * qtyBase) / pool.qtyBase);
  return {
    costPaise,
    pool: { qtyBase: pool.qtyBase - qtyBase, valuePaise: pool.valuePaise - costPaise },
    avgCostPaise: avg,
  };
}

/** Put a cost back into the pool (used when a sale is cancelled). */
export function returnToPool(
  pool: CostPool,
  qtyBase: number,
  costPaise: number,
  factor: number,
): CostPool {
  if (!Number.isInteger(qtyBase) || qtyBase < 0) throw new Error(`Invalid quantity: ${qtyBase}`);
  if (factor <= 0) throw new Error(`Invalid factor: ${factor}`);
  return { qtyBase: pool.qtyBase + qtyBase, valuePaise: pool.valuePaise + costPaise };
}

/**
 * Rebuild a pool from the open batches (one-off backfill / repair).
 * Value = Σ (qty × unit price) + the purchase expenses of those batches,
 * prorated over the quantity still on hand.
 */
export function poolFromBatches(
  openBatches: readonly {
    qtyRemaining: number;
    unitPricePaise: number;
    expensesPaise?: number;
    qtyOriginal?: number;
  }[],
  factor: number,
): CostPool {
  let qtyBase = 0;
  let valuePaise = 0;
  for (const batch of openBatches) {
    if (batch.qtyRemaining <= 0) continue;
    qtyBase += batch.qtyRemaining;
    valuePaise += purchaseValuePaise(batch.qtyRemaining, batch.unitPricePaise, factor);
    // The transport/loading of that purchase belongs to the stock that is still
    // on hand — the part already sold carries its share.
    const expenses = batch.expensesPaise ?? 0;
    const original = batch.qtyOriginal ?? 0;
    if (expenses > 0 && original > 0) {
      valuePaise += Math.round((expenses * batch.qtyRemaining) / original);
    }
  }
  return { qtyBase, valuePaise };
}
