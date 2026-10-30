import { ValidationError } from "./errors";

/** Average daily consumption over a window (default 30 days). */
export function dailyUsage(qtyUsed: number, days = 30): number {
  if (!Number.isFinite(qtyUsed) || qtyUsed < 0) {
    throw new ValidationError("Quantity cannot be negative");
  }
  if (!Number.isFinite(days) || days <= 0) return 0;
  return qtyUsed / days;
}

/** Whole days of stock left, or null when there is no usage to extrapolate from. */
export function daysLeft(stock: number, perDay: number): number | null {
  if (!Number.isFinite(stock) || stock < 0) return 0;
  if (!Number.isFinite(perDay) || perDay <= 0) return null;
  return Math.floor(stock / perDay);
}

/** Percentage change between two prices in paise. 1000 → 1200 = 20. */
export function priceChangePct(previousPaise: number, latestPaise: number): number {
  if (!previousPaise) return 0;
  return ((latestPaise - previousPaise) / previousPaise) * 100;
}

/** Percentage change between two spend totals. 10000 → 11800 = 18. */
export function spendChangePct(previousPaise: number, currentPaise: number): number {
  if (!previousPaise) return 0;
  return ((currentPaise - previousPaise) / previousPaise) * 100;
}
