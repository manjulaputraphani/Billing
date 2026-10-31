import { describe, expect, it } from "vitest";
import {
  addPurchaseToPool,
  avgCostPaise,
  poolFromBatches,
  purchaseValuePaise,
  returnToPool,
  takeFromPool,
  type CostPool,
} from "./weightedCost";

const KG = 1000; // base units (g) per display unit (kg)

describe("weighted average cost", () => {
  it("values a purchase at the quoted rate", () => {
    expect(purchaseValuePaise(100_000, 10_000, KG)).toBe(1_000_000); // 100 kg @ ₹100
    expect(purchaseValuePaise(3, 500, 1)).toBe(1_500); // 3 pcs @ ₹5
  });

  it("keeps the average when nothing else is bought", () => {
    const pool = addPurchaseToPool({ qtyBase: 0, valuePaise: 0 }, 100_000, 10_000, 0, KG);
    expect(avgCostPaise(pool, KG)).toBe(10_000); // ₹100 per kg
  });

  it("folds purchase expenses into the stock cost", () => {
    const pool = addPurchaseToPool({ qtyBase: 0, valuePaise: 0 }, 100_000, 10_000, 30_000, KG);
    expect(pool.valuePaise).toBe(1_030_000);
    expect(avgCostPaise(pool, KG)).toBe(10_300); // ₹103 per kg
  });

  /**
   * The required test case:
   * buy 100 kg @ ₹100 and 200 kg @ ₹102 with ₹300 transport,
   * then sell 20 kg @ ₹110 with ₹40 delivery.
   * Expected: avg cost ₹102.33/kg, gross profit ₹153.33, net profit ₹113.33,
   * remaining stock 280 kg.
   */
  it("matches the required buy → sell test case", () => {
    // Buy 100 kg @ ₹100.
    let pool: CostPool = addPurchaseToPool({ qtyBase: 0, valuePaise: 0 }, 100_000, 10_000, 0, KG);
    expect(pool).toEqual({ qtyBase: 100_000, valuePaise: 1_000_000 });

    // Buy 200 kg @ ₹102 with ₹300 transport.
    pool = addPurchaseToPool(pool, 200_000, 10_200, 30_000, KG);
    expect(pool).toEqual({ qtyBase: 300_000, valuePaise: 3_070_000 });
    expect(avgCostPaise(pool, KG)).toBe(10_233); // ₹102.33 per kg

    // Sell 20 kg @ ₹110 with ₹40 delivery.
    const saleValuePaise = purchaseValuePaise(20_000, 11_000, KG); // ₹2 200
    const take = takeFromPool(pool, 20_000, KG);
    expect(take.costPaise).toBe(204_667); // COGS ₹2 046.67
    expect(take.avgCostPaise).toBe(10_233); // snapshot ₹102.33 per kg

    const grossProfitPaise = saleValuePaise - take.costPaise;
    expect(grossProfitPaise).toBe(15_333); // ₹153.33

    const netProfitPaise = grossProfitPaise - 4_000; // ₹40 delivery
    expect(netProfitPaise).toBe(11_333); // ₹113.33

    expect(take.pool.qtyBase).toBe(280_000); // 280 kg left
    expect(avgCostPaise(take.pool, KG)).toBe(10_233); // still ₹102.33 per kg
  });

  it("keeps the average when the sale removes part of the stock", () => {
    const pool = addPurchaseToPool({ qtyBase: 0, valuePaise: 0 }, 50_000, 12_000, 0, KG);
    const take = takeFromPool(pool, 10_000, KG);
    expect(take.costPaise).toBe(120_000); // 10 kg @ ₹120
    expect(take.pool).toEqual({ qtyBase: 40_000, valuePaise: 480_000 });
    expect(avgCostPaise(take.pool, KG)).toBe(12_000);
  });

  it("takes the whole remaining value when the stock runs out", () => {
    const pool = addPurchaseToPool({ qtyBase: 0, valuePaise: 0 }, 10_000, 10_000, 0, KG);
    const take = takeFromPool(pool, 10_000, KG);
    expect(take.costPaise).toBe(100_000);
    expect(take.pool).toEqual({ qtyBase: 0, valuePaise: 0 });
  });

  it("returns the cost to the pool when a sale is cancelled", () => {
    const pool = addPurchaseToPool({ qtyBase: 0, valuePaise: 0 }, 100_000, 10_000, 0, KG);
    const take = takeFromPool(pool, 20_000, KG);
    const restored = returnToPool(take.pool, 20_000, take.costPaise, KG);
    expect(restored).toEqual({ qtyBase: 100_000, valuePaise: 1_000_000 });
  });

  it("rebuilds a pool from open batches", () => {
    const pool = poolFromBatches(
      [
        { qtyRemaining: 100_000, unitPricePaise: 10_000 },
        { qtyRemaining: 200_000, unitPricePaise: 10_200 },
      ],
      KG,
    );
    expect(pool).toEqual({ qtyBase: 300_000, valuePaise: 3_040_000 });
    expect(avgCostPaise(pool, KG)).toBe(10_133); // ₹101.33 per kg
  });

  it("ignores empty batches when rebuilding a pool", () => {
    const pool = poolFromBatches([{ qtyRemaining: 0, unitPricePaise: 10_000 }], KG);
    expect(pool).toEqual({ qtyBase: 0, valuePaise: 0 });
    expect(avgCostPaise(pool, KG)).toBe(0);
  });

  it("keeps the purchase expenses with the stock that is still on hand", () => {
    // 200 kg bought with ₹300 transport, 50 kg already sold → 150 kg left
    // carries 300 × (150/200) = ₹225 of the transport.
    const pool = poolFromBatches(
      [{ qtyRemaining: 150_000, qtyOriginal: 200_000, unitPricePaise: 10_200, expensesPaise: 30_000 }],
      KG,
    );
    expect(pool.qtyBase).toBe(150_000);
    expect(pool.valuePaise).toBe(1_530_000 + 22_500); // ₹15 300 + ₹225
    expect(avgCostPaise(pool, KG)).toBe(10_350); // ₹103.50 per kg
  });
});
