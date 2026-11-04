/**
 * Analytics formulas — docs/spec: batch/FIFO analytics dashboard (2026-11-04).
 * Money is integer paise; quantity is integer base units; `factor` is base
 * units per priced unit (1000 for kg/l, 1 for pcs) — same convention as fifo.ts.
 */
import { priceChangePct } from "./stats";

export type Paise = number;
export type PeriodKind = "today" | "week" | "month" | "custom";

export type Period = {
  start: string; // ISO date, inclusive
  end: string; // ISO date, inclusive
  days: number; // days in the window (inclusive)
  prevStart: string;
  prevEnd: string;
};

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetweenInclusive(start: string, end: string): number {
  const ms = new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** Today / this week (Mon–Sun) / this month / custom range + the previous equal-length window. */
export function periodRange(
  kind: PeriodKind,
  now: Date,
  custom?: { from: string; to: string },
): Period {
  const today = iso(now);
  if (kind === "custom" && custom && custom.from && custom.to) {
    const days = daysBetweenInclusive(custom.from, custom.to);
    return {
      start: custom.from,
      end: custom.to,
      days,
      prevStart: iso(new Date(new Date(`${custom.from}T00:00:00Z`).getTime() - days * 86_400_000)),
      prevEnd: iso(new Date(new Date(`${custom.from}T00:00:00Z`).getTime() - 86_400_000)),
    };
  }
  if (kind === "week") {
    const dow = (now.getUTCDay() + 6) % 7; // Monday = 0
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - dow);
    return periodRange("custom", now, { from: iso(start), to: today });
  }
  if (kind === "month") {
    return periodRange("custom", now, { from: `${today.slice(0, 7)}-01`, to: today });
  }
  return periodRange("custom", now, { from: today, to: today });
}

/** ▲ increase, ▼ decrease, ● no change. pct has 2-decimal precision. */
export type Indicator = { direction: "up" | "down" | "flat"; pct: number };

export function changeIndicator(previous: number, current: number): Indicator {
  if (previous === current) return { direction: "flat", pct: 0 };
  if (previous === 0) return { direction: current > 0 ? "up" : "flat", pct: 100 };
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 100) / 100;
  return { direction: pct > 0 ? "up" : "down", pct: rounded };
}

/** Batch profit = (selling price − batch purchase price) × quantity sold from that batch. */
export function batchProfitPaise(
  sellUnitPaise: Paise,
  buyUnitPaise: Paise,
  qtySoldBase: number,
  factor: number,
): Paise {
  return Math.round(((sellUnitPaise - buyUnitPaise) * qtySoldBase) / factor);
}

/** Gross profit = Sales − COGS. */
export function grossProfitPaise(netSalesPaise: Paise, cogsPaise: Paise): Paise {
  return netSalesPaise - cogsPaise;
}

/** Net profit = Gross profit − Expenses. */
export function netProfitPaise(grossPaise: Paise, expensesPaise: Paise): Paise {
  return grossPaise - expensesPaise;
}

/** Profit % = Net profit ÷ COGS × 100. */
export function profitPct(netPaise: Paise, cogsPaise: Paise): number {
  return cogsPaise > 0 ? (netPaise / cogsPaise) * 100 : 0;
}

/** Capital turnover = Net sales ÷ Average capital ((opening + closing) ÷ 2). */
export function capitalTurnover(
  netSalesPaise: Paise,
  openingCapitalPaise: Paise,
  closingCapitalPaise: Paise,
): number {
  const avg = (openingCapitalPaise + closingCapitalPaise) / 2;
  return avg > 0 ? netSalesPaise / avg : 0;
}

/** Days to rotate capital = days in selected period ÷ capital turnover. */
export function daysToRotateCapital(daysInPeriod: number, turnover: number): number | null {
  return turnover > 0 ? daysInPeriod / turnover : null;
}

/** Inventory turnover = COGS ÷ Average stock value ((opening + closing) ÷ 2). */
export function inventoryTurnover(
  cogsPaise: Paise,
  openingStockPaise: Paise,
  closingStockPaise: Paise,
): number {
  const avg = (openingStockPaise + closingStockPaise) / 2;
  return avg > 0 ? cogsPaise / avg : 0;
}

/** Remaining stock value = remaining quantity × its batch purchase price. */
export function remainingStockValuePaise(
  qtyRemainingBase: number,
  unitPricePaise: Paise,
  factor: number,
): Paise {
  return Math.round((qtyRemainingBase * unitPricePaise) / factor);
}

/** Price change between consecutive batches of the same item, in %. */
export function batchPriceChangePct(previousBuyPaise: Paise, latestBuyPaise: Paise): number {
  return priceChangePct(previousBuyPaise, latestBuyPaise);
}

export type BatchInput = {
  id: number;
  purchaseDate: string;
  buyUnitPaise: Paise;
  qtyOriginalBase: number;
  qtyRemainingBase: number;
};

export type TakeInput = {
  batchId: number;
  saleDate: string;
  qtyTakenBase: number;
  sellUnitPaise: Paise;
};

export type BatchRow = {
  batchId: number;
  purchaseDate: string;
  buyUnitPaise: Paise;
  priceChange: Indicator; // buy price vs previous batch of the same item
  qtyOriginalBase: number;
  qtySoldBase: number;
  avgSellUnitPaise: Paise; // weighted average of the takes
  sellVsBuy: Indicator; // sell vs buy %
  qtyRemainingBase: number;
  remainingValuePaise: Paise;
  profitPaise: Paise;
  takes: TakeInput[];
  status: "open" | "sold out";
};

/** Per-batch analysis rows for one item (batches date-ordered, takes folded in). */
export function buildBatchRows(batches: BatchInput[], takes: TakeInput[], factor: number): BatchRow[] {
  const ordered = [...batches].sort(
    (a, b) => a.purchaseDate.localeCompare(b.purchaseDate) || a.id - b.id,
  );
  const byBatch = new Map<number, TakeInput[]>();
  for (const take of [...takes].sort((a, b) => a.saleDate.localeCompare(b.saleDate))) {
    const list = byBatch.get(take.batchId) ?? [];
    list.push(take);
    byBatch.set(take.batchId, list);
  }

  const rows: BatchRow[] = [];
  let previousBuy: Paise | null = null;
  for (const batch of ordered) {
    const batchTakes = byBatch.get(batch.id) ?? [];
    const qtySold = batchTakes.reduce((sum, t) => sum + t.qtyTakenBase, 0);
    const salesPaise = batchTakes.reduce(
      (sum, t) => sum + Math.round((t.qtyTakenBase * t.sellUnitPaise) / factor),
      0,
    );
    const avgSell = qtySold > 0 ? Math.round(salesPaise / (qtySold / factor)) : 0;
    const profit = batchTakes.reduce(
      (sum, t) => sum + batchProfitPaise(t.sellUnitPaise, batch.buyUnitPaise, t.qtyTakenBase, factor),
      0,
    );
    const qtyRemaining = batch.qtyOriginalBase - qtySold;
    rows.push({
      batchId: batch.id,
      purchaseDate: batch.purchaseDate,
      buyUnitPaise: batch.buyUnitPaise,
      priceChange: previousBuy === null ? { direction: "flat", pct: 0 } : changeIndicator(previousBuy, batch.buyUnitPaise),
      qtyOriginalBase: batch.qtyOriginalBase,
      qtySoldBase: qtySold,
      avgSellUnitPaise: avgSell,
      sellVsBuy: qtySold > 0 ? changeIndicator(batch.buyUnitPaise, avgSell) : { direction: "flat", pct: 0 },
      qtyRemainingBase: qtyRemaining,
      remainingValuePaise: remainingStockValuePaise(qtyRemaining, batch.buyUnitPaise, factor),
      profitPaise: profit,
      takes: batchTakes,
      status: qtyRemaining === 0 ? "sold out" : "open",
    });
    previousBuy = batch.buyUnitPaise;
  }
  return rows;
}

/** Format ₹ with 2 decimals. */
export function rupees(paise: Paise): string {
  return `₹${(paise / 100).toFixed(2)}`;
}