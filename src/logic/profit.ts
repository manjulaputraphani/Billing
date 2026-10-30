/**
 * Profit helpers — PURE, money in integer paise (docs/PLAN_V2.md §Phase 10).
 * `marginPct` is for display only; never store a float percentage.
 */

export type ProfitLine = { lineTotalPaise: number; costPaise: number };

/** Profit on one bill line: line total − FIFO cost. */
export function lineProfit(lineTotalPaise: number, costPaise: number): number {
  return lineTotalPaise - costPaise;
}

/** Profit on a whole bill (sum of its lines). */
export function billProfit(lines: readonly ProfitLine[]): number {
  return lines.reduce((sum, line) => sum + lineProfit(line.lineTotalPaise, line.costPaise), 0);
}

/**
 * Margin as a percentage of revenue, for display.
 * Zero/negative revenue has no meaningful margin → 0.
 */
export function marginPct(profitPaise: number, revenuePaise: number): number {
  if (!Number.isFinite(revenuePaise) || revenuePaise <= 0) return 0;
  return (profitPaise / revenuePaise) * 100;
}
