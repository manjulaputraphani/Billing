import { describe, it, expect } from "vitest";
import { computeUsage } from "./stockCheck";
import { StockLeftTooHighError, ValidationError } from "./errors";

describe("computeUsage — docs/TESTING.md §A3", () => {
  it("4000 left 2000 → used 2000", () => {
    expect(computeUsage(4000, 2000)).toBe(2000);
  });

  it("4000 left 4000 → used 0", () => {
    expect(computeUsage(4000, 4000)).toBe(0);
  });

  it("4000 left 6000 → StockLeftTooHighError", () => {
    expect(() => computeUsage(4000, 6000)).toThrow(StockLeftTooHighError);
  });

  it("4000 left -1 → validation error", () => {
    expect(() => computeUsage(4000, -1)).toThrow(ValidationError);
  });

  it("says a missed purchase is the likely cause", () => {
    expect(() => computeUsage(4000, 6000)).toThrow(/miss a purchase/i);
  });

  it("rejects fractional base units", () => {
    expect(() => computeUsage(4000, 1999.5)).toThrow(ValidationError);
  });
});
