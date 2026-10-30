import { describe, it, expect } from "vitest";
import { averageCost, weightedAverage } from "./average";

describe("weightedAverage / averageCost — docs/TESTING.md §A4", () => {
  const batches = [
    { qtyRemaining: 1000, unitPricePaise: 1000 },
    { qtyRemaining: 3000, unitPricePaise: 1200 },
  ];

  it("1000g@1000 + 3000g@1200 → avg 1150 paise/kg", () => {
    expect(weightedAverage(batches)).toBe(1150);
  });

  it("2000 g at that average → 2300 paise", () => {
    expect(averageCost(2000, 1150, 1000)).toBe(2300);
  });

  it("ignores empty batches", () => {
    expect(
      weightedAverage([
        { qtyRemaining: 0, unitPricePaise: 9999 },
        { qtyRemaining: 2000, unitPricePaise: 1000 },
      ]),
    ).toBe(1000);
  });

  it("is zero when there is no stock", () => {
    expect(weightedAverage([])).toBe(0);
    expect(averageCost(0, 0, 1000)).toBe(0);
  });

  it("rounds to whole paise", () => {
    const avg = weightedAverage([
      { qtyRemaining: 1000, unitPricePaise: 1000 },
      { qtyRemaining: 2000, unitPricePaise: 1000 },
    ]);
    expect(Number.isInteger(avg)).toBe(true);
    expect(Number.isInteger(averageCost(333, 1150, 1000))).toBe(true);
  });

  it("handles pieces (factor 1)", () => {
    expect(averageCost(3, 500, 1)).toBe(1500);
  });
});
