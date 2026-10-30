import { costPaise, toBase, type Unit } from "./units";

/** Total for a purchase form: qty is in the item's display unit, price per same unit. */
export function computeTotalPaise(qty: number, unitPricePaise: number, unit: Unit): number {
  return costPaise(toBase(qty, unit), unitPricePaise, unit);
}

/** "12.50" ₹ → 1250 paise. Blank/invalid input is 0. */
export function rupeesToPaise(input: string): number {
  const value = Number(input);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

/** "+20% vs last time" / "-5% vs last time" / "same as last time" / null. */
export function formatPriceChange(newPaise: number, oldPaise: number): string | null {
  if (!oldPaise) return null;
  const pct = ((newPaise - oldPaise) / oldPaise) * 100;
  if (Math.abs(pct) < 0.05) return "same as last time";
  const sign = pct > 0 ? "+" : "-";
  return `${sign}${Math.abs(pct).toFixed(0)}% vs last time`;
}
