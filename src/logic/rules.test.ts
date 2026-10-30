import { describe, it, expect } from "vitest";
import { buildSuggestions, type RuleItem, type RuleStats } from "./rules";

function item(over: Partial<RuleItem> = {}): RuleItem {
  return {
    itemId: 1,
    itemName: "Rice",
    unit: "kg",
    stockLeft: 10000,
    minStock: 0,
    qtyUsed30d: 3000,
    qtyBought30d: 3000,
    wastage30d: 0,
    latestPricePaise: null,
    previousPricePaise: null,
    ...over,
  };
}

const stats = (items: RuleItem[], monthSpendPaise = 0, previousMonthSpendPaise = 0): RuleStats => ({
  items,
  monthSpendPaise,
  previousMonthSpendPaise,
});

describe("buildSuggestions — rule layer (§A5 / §F)", () => {
  it("no data → empty list", () => {
    expect(buildSuggestions(stats([]))).toEqual([]);
  });

  it("low stock: 18 kg used in 30 days, 3 kg left → ~5 days", () => {
    const out = buildSuggestions(stats([item({ stockLeft: 3000, qtyUsed30d: 18000 })]));
    const low = out.find((s) => s.type === "low_stock");
    expect(low?.message).toContain("about 5 days");
    expect(low?.numbers.daysLeft).toBe(5);
  });

  it("low stock is priority 1 when under two days", () => {
    const out = buildSuggestions(stats([item({ stockLeft: 600, qtyUsed30d: 18000 })]));
    expect(out[0]).toMatchObject({ type: "low_stock", priority: 1 });
  });

  it("falls back to the minimum when there is no usage history", () => {
    const out = buildSuggestions(
      stats([item({ stockLeft: 500, minStock: 1000, qtyUsed30d: 0 })]),
    );
    expect(out.find((s) => s.type === "low_stock")?.message).toContain("below its minimum");
  });

  it("price +20% fires, +5% does not", () => {
    const fires = buildSuggestions(
      stats([item({ previousPricePaise: 1000, latestPricePaise: 1200 })]),
    );
    expect(fires.some((s) => s.type === "price_up")).toBe(true);

    const quiet = buildSuggestions(
      stats([item({ previousPricePaise: 1000, latestPricePaise: 1050 })]),
    );
    expect(quiet.some((s) => s.type === "price_up")).toBe(false);
  });

  it("spend +18% fires, +10% does not", () => {
    expect(
      buildSuggestions(stats([], 11800, 10000)).some((s) => s.type === "spend_up"),
    ).toBe(true);
    expect(
      buildSuggestions(stats([], 11000, 10000)).some((s) => s.type === "spend_up"),
    ).toBe(false);
  });

  it("overbuying: bought more than twice what was used", () => {
    const out = buildSuggestions(
      stats([item({ qtyBought30d: 6000, qtyUsed30d: 2000, stockLeft: 4000 })]),
    );
    expect(out.some((s) => s.type === "overbuying")).toBe(true);
  });

  it("high wastage: more than 5% of what was used", () => {
    const out = buildSuggestions(
      stats([item({ wastage30d: 300, qtyUsed30d: 2000, stockLeft: 5000 })]),
    );
    expect(out.some((s) => s.type === "high_wastage")).toBe(true);
  });

  it("messages use ₹ and never invent numbers", () => {
    const out = buildSuggestions(
      stats(
        [item({ previousPricePaise: 1000, latestPricePaise: 1200 })],
        11800,
        10000,
      ),
    );
    const price = out.find((s) => s.type === "price_up");
    expect(price?.message).toContain("₹10.00");
    expect(price?.message).toContain("₹12.00");
    const spend = out.find((s) => s.type === "spend_up");
    expect(spend?.message).toContain("₹118.00");
    expect(spend?.message).toContain("₹100.00");
  });

  it("orders priority 1 before 3", () => {
    const out = buildSuggestions(
      stats([
        item({ qtyBought30d: 9000, qtyUsed30d: 1000, stockLeft: 8000 }),
        item({ itemId: 2, itemName: "Dal", stockLeft: 0, minStock: 0, qtyUsed30d: 3000 }),
      ]),
    );
    expect(out[0].priority).toBe(1);
    expect(out[out.length - 1].priority).toBe(3);
  });
});
