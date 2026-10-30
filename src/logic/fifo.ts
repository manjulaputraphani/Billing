import { InsufficientStockError, ValidationError } from "./errors";

export type FifoBatch = {
  id: number;
  qtyRemaining: number;
  unitPricePaise: number;
  purchaseDate: string;
};

export type FifoTake = {
  batchId: number;
  qty: number;
  unitPricePaise: number;
  costPaise: number;
};

export type FifoResult = {
  takes: FifoTake[];
  totalCostPaise: number;
};

/**
 * Take `qtyUsed` base units from the oldest batches first (docs/BLUEPRINT.md §5).
 * `factor` is base units per priced unit: 1000 for kg/l, 1 for pcs.
 * Pure: does not mutate `batches`.
 */
export function allocateFifo(
  batches: readonly FifoBatch[],
  qtyUsed: number,
  factor: number,
): FifoResult {
  if (!Number.isFinite(qtyUsed) || qtyUsed < 0) {
    throw new ValidationError("Quantity cannot be negative");
  }
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new ValidationError("Invalid unit factor");
  }
  if (!Number.isInteger(qtyUsed)) {
    throw new ValidationError("Quantity must be whole base units");
  }
  if (qtyUsed === 0) {
    return { takes: [], totalCostPaise: 0 };
  }

  const ordered = [...batches]
    .filter((batch) => batch.qtyRemaining > 0)
    .sort(
      (a, b) =>
        a.purchaseDate.localeCompare(b.purchaseDate) || a.id - b.id,
    );

  const available = ordered.reduce((sum, batch) => sum + batch.qtyRemaining, 0);
  if (qtyUsed > available) {
    throw new InsufficientStockError(
      `Not enough stock: need ${qtyUsed}, only ${available} left`,
    );
  }

  const takes: FifoTake[] = [];
  let remaining = qtyUsed;
  let totalCostPaise = 0;

  for (const batch of ordered) {
    if (remaining === 0) break;
    const qty = Math.min(batch.qtyRemaining, remaining);
    const costPaise = Math.round((qty * batch.unitPricePaise) / factor);
    takes.push({
      batchId: batch.id,
      qty,
      unitPricePaise: batch.unitPricePaise,
      costPaise,
    });
    totalCostPaise += costPaise;
    remaining -= qty;
  }

  return { takes, totalCostPaise };
}
