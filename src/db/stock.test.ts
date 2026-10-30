import { describe, it, expect } from "vitest";
import { planStockEntry, type OpenBatch } from "./stock";
import { StockLeftTooHighError } from "../logic/errors";

const A: OpenBatch = { id: 1, qtyRemaining: 1000, unitPricePaise: 1000, purchaseDate: "2026-10-01" };
const B: OpenBatch = { id: 2, qtyRemaining: 3000, unitPricePaise: 1200, purchaseDate: "2026-10-02" };

describe("planStockEntry (preview == what gets saved)", () => {
  it("worked example: 4 kg on hand, 2 kg left → used 2000, cost 2200", () => {
    const plan = planStockEntry([A, B], { type: "STOCK_CHECK", enteredLeft: 2000 }, 1000);

    expect(plan.used).toBe(2000);
    expect(plan.totalCostPaise).toBe(2200);
    expect(plan.takes).toEqual([
      { batchId: 1, qty: 1000, unitPricePaise: 1000, costPaise: 1000 },
      { batchId: 2, qty: 1000, unitPricePaise: 1200, costPaise: 1200 },
    ]);
    expect(plan.remaining).toEqual([
      { id: 1, qtyRemaining: 0 },
      { id: 2, qtyRemaining: 2000 },
    ]);
    expect(plan.leftQty).toBe(2000);
    expect(plan.leftValuePaise).toBe(2400);
  });

  it("nothing used when stock left equals current stock", () => {
    const plan = planStockEntry([A, B], { type: "STOCK_CHECK", enteredLeft: 4000 }, 1000);
    expect(plan.used).toBe(0);
    expect(plan.takes).toEqual([]);
    expect(plan.totalCostPaise).toBe(0);
    expect(plan.leftQty).toBe(4000);
  });

  it("stock left above current stock is rejected", () => {
    expect(() => planStockEntry([A, B], { type: "STOCK_CHECK", enteredLeft: 5000 }, 1000)).toThrow(
      StockLeftTooHighError,
    );
  });

  it("usage takes the given quantity FIFO", () => {
    const plan = planStockEntry([A, B], { type: "USAGE", qty: 1500 }, 1000);
    expect(plan.used).toBe(1500);
    expect(plan.totalCostPaise).toBe(1600); // A 1000@1000 + B 500@1200
    expect(plan.remaining).toEqual([
      { id: 1, qtyRemaining: 0 },
      { id: 2, qtyRemaining: 2500 },
    ]);
  });

  it("wastage behaves like usage", () => {
    const plan = planStockEntry([A, B], { type: "WASTAGE", qty: 300 }, 1000);
    expect(plan.used).toBe(300);
    expect(plan.totalCostPaise).toBe(300);
  });
});
