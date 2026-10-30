import { allocateFifo, type FifoBatch, type FifoTake } from "./fifo";
import { ValidationError } from "./errors";

export type SalePlan = {
  takes: FifoTake[];
  /** Cost of the sold goods (FIFO purchase cost). */
  totalCostPaise: number;
  /** What the customer pays: round(qtyBase × price / factor). */
  revenuePaise: number;
  remaining: { id: number; qtyRemaining: number }[];
  leftQty: number;
  leftValuePaise: number;
};

/**
 * Preview a sale: which batches it takes (oldest first), the revenue, and the
 * stock left afterwards. `factor` = base units per priced unit (1000 for kg/l,
 * 1 for pcs). Pure — does not mutate `openBatches`.
 */
export function planSale(
  openBatches: readonly FifoBatch[],
  qtyBase: number,
  unitPricePaise: number,
  factor: number,
): SalePlan {
  if (!Number.isInteger(qtyBase) || qtyBase <= 0) {
    throw new ValidationError("Quantity must be a positive whole number");
  }
  if (!Number.isInteger(unitPricePaise) || unitPricePaise < 0) {
    throw new ValidationError("Price cannot be negative");
  }

  const allocation = allocateFifo(openBatches, qtyBase, factor);
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
    takes: allocation.takes,
    totalCostPaise: allocation.totalCostPaise,
    revenuePaise: Math.round((qtyBase * unitPricePaise) / factor),
    remaining,
    leftQty: remaining.reduce((sum, r) => sum + r.qtyRemaining, 0),
    leftValuePaise,
  };
}
