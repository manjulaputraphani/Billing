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

  // The shop owner's exact scenario: same product bought at two prices on
  // different days, then sold in two lots. FIFO must pull the older batch
  // first and report the real per-batch cost, not a blended average.
  describe("owner scenario: 100 kg @ ₹100, 60 kg @ ₹110, sell 80 then 60", () => {
    const lotA: FifoBatch = {
      id: 1,
      qtyRemaining: 100_000, // 100 kg
      unitPricePaise: 10_000, // ₹100/kg
      purchaseDate: "2026-10-01",
    };
    const lotB: FifoBatch = {
      id: 2,
      qtyRemaining: 60_000, // 60 kg
      unitPricePaise: 11_000, // ₹110/kg
      purchaseDate: "2026-10-02",
    };

    it("sale 1: 80 kg @ ₹120 → all from lot A, cost ₹8000, profit ₹1600, 20 kg of A left", () => {
      const plan = planSale([lotA, lotB], 80_000, 12_000, KG);
      expect(plan.takes).toEqual([
        { batchId: 1, qty: 80_000, unitPricePaise: 10_000, costPaise: 800_000 },
      ]);
      expect(plan.totalCostPaise).toBe(800_000); // ₹8000
      expect(plan.revenuePaise).toBe(960_000); // ₹9600
      expect(plan.revenuePaise - plan.totalCostPaise).toBe(160_000); // ₹1600 profit
      expect(plan.remaining).toEqual([
        { id: 1, qtyRemaining: 20_000 }, // 20 kg of A left
        { id: 2, qtyRemaining: 60_000 }, // B untouched
      ]);
      expect(plan.leftQty).toBe(80_000); // 80 kg left overall
    });

    it("sale 2: 60 kg @ ₹130 → 20 kg from A + 40 kg from B, cost ₹6400, profit ₹1400", () => {
      // After sale 1, lot A has 20 kg left.
      const afterA: FifoBatch = { ...lotA, qtyRemaining: 20_000 };
      const plan = planSale([afterA, lotB], 60_000, 13_000, KG);
      expect(plan.takes).toEqual([
        { batchId: 1, qty: 20_000, unitPricePaise: 10_000, costPaise: 200_000 }, // ₹2000
        { batchId: 2, qty: 40_000, unitPricePaise: 11_000, costPaise: 440_000 }, // ₹4400
      ]);
      expect(plan.totalCostPaise).toBe(640_000); // ₹6400
      expect(plan.revenuePaise).toBe(780_000); // ₹7800
      expect(plan.remaining).toEqual([
        { id: 1, qtyRemaining: 0 }, // A empty
        { id: 2, qtyRemaining: 20_000 }, // 20 kg of B left
      ]);
      expect(plan.leftQty).toBe(20_000); // 20 kg left overall
    });
  });
});
