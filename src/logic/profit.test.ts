import { describe, it, expect } from "vitest";
import { billProfit, lineProfit, marginPct } from "./profit";

describe("profit", () => {
  it("matches the V2-P10 FIFO example: 2kg @ ₹15, cost ₹22 → profit ₹8", () => {
    // revenue 3000 paise, cost 2200 paise
    expect(lineProfit(3000, 2200)).toBe(800);
  });

  it("sums profit across bill lines", () => {
    const lines = [
      { lineTotalPaise: 3000, costPaise: 2200 }, // +800
      { lineTotalPaise: 10000, costPaise: 8000 }, // +2000
      { lineTotalPaise: 500, costPaise: 700 }, // −200 (loss allowed)
    ];
    expect(billProfit(lines)).toBe(2600);
  });

  it("computes margin as a percentage of revenue", () => {
    expect(marginPct(800, 3000)).toBeCloseTo(26.6667, 3);
    expect(marginPct(0, 1000)).toBe(0);
    expect(marginPct(-500, 1000)).toBe(-50);
  });

  it("returns 0 margin for zero or negative revenue", () => {
    expect(marginPct(500, 0)).toBe(0);
    expect(marginPct(500, -10)).toBe(0);
  });

  it("is integer-safe for paise arithmetic", () => {
    expect(lineProfit(123456, 100000)).toBe(23456);
  });
});
