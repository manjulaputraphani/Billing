type StockBatch = { qtyRemaining: number; unitPricePaise: number };

/**
 * Average price per display unit, weighted by remaining quantity.
 * 1000 g @ 1000 + 3000 g @ 1200 → 1150 (paise per kg). Rounded to paise.
 */
export function weightedAverage(batches: readonly StockBatch[]): number {
  let qty = 0;
  let value = 0;
  for (const batch of batches) {
    if (batch.qtyRemaining <= 0) continue;
    qty += batch.qtyRemaining;
    value += batch.qtyRemaining * batch.unitPricePaise;
  }
  if (qty === 0) return 0;
  return Math.round(value / qty);
}

/** Cost of `qtyUsed` base units at an average price per display unit. */
export function averageCost(qtyUsed: number, avgPaisePerUnit: number, factor: number): number {
  if (factor <= 0) return 0;
  return Math.round((qtyUsed * avgPaisePerUnit) / factor);
}
