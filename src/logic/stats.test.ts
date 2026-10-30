import { describe, it, expect } from "vitest";
import { dailyUsage, daysLeft, priceChangePct, spendChangePct } from "./stats";

describe("stats — docs/TESTING.md §A5", () => {
  it("30 days, 18000 g used → 600 g/day; 3000 in stock → 5 days left", () => {
    const perDay = dailyUsage(18000, 30);
    expect(perDay).toBe(600);
    expect(daysLeft(3000, perDay)).toBe(5);
  });

  it("price 1000 → 1200 is +20%; 1000 → 1050 is +5%", () => {
    expect(priceChangePct(1000, 1200)).toBe(20);
    expect(priceChangePct(1000, 1050)).toBeCloseTo(5, 10);
  });

  it("spend 10000 → 11800 is +18%", () => {
    expect(spendChangePct(10000, 11800)).toBeCloseTo(18, 10);
  });

  it("no usage history → days left unknown, not a crash", () => {
    expect(daysLeft(3000, 0)).toBeNull();
    expect(dailyUsage(0, 30)).toBe(0);
  });

  it("no previous value → 0% change", () => {
    expect(priceChangePct(0, 1200)).toBe(0);
    expect(spendChangePct(0, 500)).toBe(0);
  });

  it("rejects a negative quantity", () => {
    expect(() => dailyUsage(-1, 30)).toThrow();
  });

  it("is integer-safe where it matters", () => {
    expect(Number.isInteger(daysLeft(3000, 600))).toBe(true);
  });
});
