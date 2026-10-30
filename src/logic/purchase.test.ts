import { describe, it, expect } from "vitest";
import { computeTotalPaise, formatPriceChange, rupeesToPaise } from "./purchase";

describe("computeTotalPaise (live total)", () => {
  it("2 kg x ₹12 = ₹24.00", () => {
    expect(computeTotalPaise(2, 1200, "kg")).toBe(2400);
  });

  it("handles grams-as-kg, litres and pieces", () => {
    expect(computeTotalPaise(0.25, 1200, "kg")).toBe(300);
    expect(computeTotalPaise(1.5, 8000, "l")).toBe(12000);
    expect(computeTotalPaise(3, 500, "pcs")).toBe(1500);
  });

  it("is zero for empty/zero quantity", () => {
    expect(computeTotalPaise(0, 1200, "kg")).toBe(0);
  });
});

describe("rupeesToPaise", () => {
  it("parses plain and decimal rupees into integer paise", () => {
    expect(rupeesToPaise("12")).toBe(1200);
    expect(rupeesToPaise("12.5")).toBe(1250);
    expect(rupeesToPaise("12.50")).toBe(1250);
    expect(rupeesToPaise("0.05")).toBe(5);
    expect(rupeesToPaise("")).toBe(0);
    expect(rupeesToPaise("abc")).toBe(0);
  });

  it("never returns a float", () => {
    expect(Number.isInteger(rupeesToPaise("1.1"))).toBe(true);
    expect(rupeesToPaise("1.1")).toBe(110);
  });
});

describe("formatPriceChange", () => {
  it("reports an increase", () => {
    expect(formatPriceChange(1200, 1000)).toBe("+20% vs last time");
  });

  it("reports a decrease", () => {
    expect(formatPriceChange(1140, 1200)).toBe("-5% vs last time");
  });

  it("reports no change", () => {
    expect(formatPriceChange(1200, 1200)).toBe("same as last time");
  });

  it("returns null when there is no previous price", () => {
    expect(formatPriceChange(1200, 0)).toBeNull();
  });
});
