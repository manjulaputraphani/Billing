import { describe, it, expect } from "vitest";
import { planSale } from "./sales";
import { InsufficientStockError, ValidationError } from "./errors";
import type { FifoBatch } from "./fifo";

const A: FifoBatch = { id: 1, qtyRemaining: 1000, unitPricePaise: 1000, purchaseDate: "2026-10-01" };
const B: FifoBatch = { id: 2, qtyRemaining: 3000, unitPricePaise: 1200, purchaseDate: "2026-10-02" };
const KG = 1000;

describe("planSale", () => {
  it("takes the oldest batch first and computes revenue and cost", () => {
    // 2 kg @ ₹20/kg → ₹40; cost = 1 kg @ ₹10 + 1 kg @ ₹12 = ₹22
    const plan = planSale([A, B], 2000, 2000, KG);
    expect(plan.takes.map((t) => [t.batchId, t.qty])).toEqual([
      [1, 1000],
      [2, 1000],
    ]);
    expect(plan.totalCostPaise).toBe(2200);
    expect(plan.revenuePaise).toBe(4000);
    expect(plan.remaining).toEqual([
      { id: 1, qtyRemaining: 0 },
      { id: 2, qtyRemaining: 2000 },
    ]);
    expect(plan.leftQty).toBe(2000);
    expect(plan.leftValuePaise).toBe(2400);
  });

  it("rounds the revenue to the nearest paise", () => {
    // 500 g @ ₹123.45/kg = 6172.5 paise → 6173
    expect(planSale([A, B], 500, 12345, KG).revenuePaise).toBe(6173);
  });

  it("handles piece items (factor 1)", () => {
    const pcs: FifoBatch = { id: 1, qtyRemaining: 10, unitPricePaise: 400, purchaseDate: "2026-10-01" };
    const plan = planSale([pcs], 3, 500, 1);
    expect(plan.revenuePaise).toBe(1500);
    expect(plan.totalCostPaise).toBe(1200);
    expect(plan.leftQty).toBe(7);
  });

  it("refuses to sell more than the stock left", () => {
    expect(() => planSale([A, B], 5000, 2000, KG)).toThrow(InsufficientStockError);
    expect(() => planSale([A, B], 5000, 2000, KG)).toThrow("Not enough stock");
  });

  it("rejects zero or negative quantities and negative prices", () => {
    expect(() => planSale([A, B], 0, 2000, KG)).toThrow(ValidationError);
    expect(() => planSale([A, B], 0, 2000, KG)).toThrow("positive");
    expect(() => planSale([A, B], 1000, -1, KG)).toThrow("Price cannot be negative");
  });
});
