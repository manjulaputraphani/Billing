import { daysLeft, priceChangePct, spendChangePct } from "./stats";
import { formatQuantity, formatRupees, type Unit } from "./units";

export type RuleItem = {
  itemId: number;
  itemName: string;
  unit: Unit;
  stockLeft: number;
  minStock: number;
  qtyUsed30d: number;
  qtyBought30d: number;
  wastage30d: number;
  latestPricePaise: number | null;
  previousPricePaise: number | null;
};

export type RuleStats = {
  items: RuleItem[];
  monthSpendPaise: number;
  previousMonthSpendPaise: number;
};

export type SuggestionType =
  | "low_stock"
  | "price_up"
  | "spend_up"
  | "overbuying"
  | "high_wastage";

export type Suggestion = {
  type: SuggestionType;
  itemId: number | null;
  itemName: string | null;
  priority: 1 | 2 | 3;
  message: string;
  numbers: Record<string, number>;
};

const LOW_STOCK_DAYS = 5;
const PRICE_UP_PCT = 10;
const SPEND_UP_PCT = 15;
const OVERBUY_RATIO = 2;
const WASTAGE_PCT = 5;

/** Rule-based suggestions. Pure — no AI, no DB (docs/BLUEPRINT.md §9). */
export function buildSuggestions(stats: RuleStats): Suggestion[] {
  const out: Suggestion[] = [];

  for (const item of stats.items) {
    const perDay = item.qtyUsed30d / 30;
    const days = daysLeft(item.stockLeft, perDay);

    if (days !== null && days <= LOW_STOCK_DAYS) {
      out.push({
        type: "low_stock",
        itemId: item.itemId,
        itemName: item.itemName,
        priority: days <= 2 ? 1 : 2,
        message: `${item.itemName} will run out in about ${days} ${days === 1 ? "day" : "days"}. Buy soon.`,
        numbers: {
          daysLeft: days,
          stockLeftBase: item.stockLeft,
          qtyUsed30d: item.qtyUsed30d,
        },
      });
    } else if (item.stockLeft <= item.minStock) {
      out.push({
        type: "low_stock",
        itemId: item.itemId,
        itemName: item.itemName,
        priority: item.stockLeft === 0 ? 1 : 2,
        message: `${item.itemName} is at or below its minimum (${formatQuantity(
          item.stockLeft,
          item.unit,
        )} left, min ${formatQuantity(item.minStock, item.unit)}).`,
        numbers: {
          stockLeftBase: item.stockLeft,
          minStockBase: item.minStock,
        },
      });
    }

    const previous = item.previousPricePaise;
    const latest = item.latestPricePaise;
    if (previous && latest) {
      const pct = priceChangePct(previous, latest);
      if (pct > PRICE_UP_PCT) {
        out.push({
          type: "price_up",
          itemId: item.itemId,
          itemName: item.itemName,
          priority: 2,
          message: `${item.itemName} price rose from ${formatRupees(previous)} to ${formatRupees(
            latest,
          )} per ${item.unit} (+${Math.round(pct)}%).`,
          numbers: {
            previousPricePaise: previous,
            latestPricePaise: latest,
            changePct: Math.round(pct),
          },
        });
      }
    }

    if (item.qtyUsed30d > 0 && item.qtyBought30d > OVERBUY_RATIO * item.qtyUsed30d) {
      out.push({
        type: "overbuying",
        itemId: item.itemId,
        itemName: item.itemName,
        priority: 3,
        message: `You bought ${formatQuantity(item.qtyBought30d, item.unit)} of ${
          item.itemName
        } in 30 days but used only ${formatQuantity(item.qtyUsed30d, item.unit)}.`,
        numbers: {
          qtyBought30d: item.qtyBought30d,
          qtyUsed30d: item.qtyUsed30d,
        },
      });
    }

    if (
      item.qtyUsed30d > 0 &&
      item.wastage30d > (WASTAGE_PCT / 100) * item.qtyUsed30d
    ) {
      out.push({
        type: "high_wastage",
        itemId: item.itemId,
        itemName: item.itemName,
        priority: 2,
        message: `${formatQuantity(item.wastage30d, item.unit)} of ${
          item.itemName
        } was wasted in 30 days (${Math.round(
          (item.wastage30d / item.qtyUsed30d) * 100,
        )}% of what you used).`,
        numbers: {
          wastage30d: item.wastage30d,
          qtyUsed30d: item.qtyUsed30d,
        },
      });
    }
  }

  if (
    stats.previousMonthSpendPaise > 0 &&
    stats.monthSpendPaise > stats.previousMonthSpendPaise * (1 + SPEND_UP_PCT / 100)
  ) {
    const pct = Math.round(
      spendChangePct(stats.previousMonthSpendPaise, stats.monthSpendPaise),
    );
    out.push({
      type: "spend_up",
      itemId: null,
      itemName: null,
      priority: 2,
      message: `Spending this month is up ${pct}% vs last month (${formatRupees(
        stats.monthSpendPaise,
      )} vs ${formatRupees(stats.previousMonthSpendPaise)}).`,
      numbers: {
        monthSpendPaise: stats.monthSpendPaise,
        previousMonthSpendPaise: stats.previousMonthSpendPaise,
        changePct: pct,
      },
    });
  }

  return out.sort((a, b) => a.priority - b.priority);
}
