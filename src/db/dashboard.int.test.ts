import { beforeEach, describe, expect, it } from "vitest";
import { resetAll, setupTestDb, testDbUrl } from "./test-utils";
import { createItem } from "./items";
import { addPurchase } from "./purchases";
import { saveStockEntry } from "./stock";
import { createExpense } from "./expenses";
import { getDashboard } from "./dashboard";

const db = await setupTestDb();
const url = testDbUrl();
const suite = db && url ? describe : describe.skip;

suite("Dashboard totals (§B6)", () => {
  beforeEach(async () => {
    if (db) await resetAll(db);
  });

  it("aggregates purchases, expenses, used cost and stock value", async () => {
    const item = await createItem(db!, { name: "Rice", unit: "kg", minStockBase: 3000 });

    // 5 kg @ ₹10, then a stock check leaving 1 kg.
    await addPurchase(db!, {
      itemId: item.id,
      qty: 5,
      unitPricePaise: 1000,
      date: "2026-10-01",
    });
    await saveStockEntry(url!, {
      itemId: item.id,
      type: "STOCK_CHECK",
      enteredLeft: 1000,
      date: "2026-10-02",
    });

    // 3 kg @ ₹12, then a stock check leaving 2 kg.
    await addPurchase(db!, {
      itemId: item.id,
      qty: 3,
      unitPricePaise: 1200,
      date: "2026-10-03",
    });
    await saveStockEntry(url!, {
      itemId: item.id,
      type: "STOCK_CHECK",
      enteredLeft: 2000,
      date: "2026-10-04",
    });

    await createExpense(db!, {
      category: "Packaging",
      amountPaise: 50000,
      date: "2026-10-05",
    });

    const data = await getDashboard(db!, "2026-10");

    expect(data.purchasesPaise).toBe(8600); // ₹86.00
    expect(data.expensesPaise).toBe(50000); // ₹500.00
    expect(data.totalSpentPaise).toBe(58600); // ₹586.00
    expect(data.usedCostPaise).toBe(6200); // ₹62.00 (4000 + 2200)
    expect(data.stockValuePaise).toBe(2400); // ₹24.00 (2 kg @ ₹12)
    expect(data.wastagePaise).toBe(0);
    expect(data.itemCount).toBe(1);

    // 2 kg left against a 3 kg minimum.
    expect(data.lowStock).toHaveLength(1);
    expect(data.lowStock[0]).toMatchObject({ name: "Rice", stockLeftBase: 2000, minStockBase: 3000 });

    expect(data.lastPurchases).toHaveLength(2);
    expect(data.lastChecks).toHaveLength(2);
  });

  it("raises a price alert only above 10%", async () => {
    const item = await createItem(db!, { name: "Sugar", unit: "kg", minStockBase: 0 });
    await addPurchase(db!, { itemId: item.id, qty: 1, unitPricePaise: 1000, date: "2026-10-01" });
    await addPurchase(db!, { itemId: item.id, qty: 1, unitPricePaise: 1050, date: "2026-10-02" });

    let data = await getDashboard(db!, "2026-10");
    expect(data.priceAlerts).toHaveLength(0);

    await addPurchase(db!, { itemId: item.id, qty: 1, unitPricePaise: 1200, date: "2026-10-03" });
    data = await getDashboard(db!, "2026-10");
    expect(data.priceAlerts).toHaveLength(1);
    expect(data.priceAlerts[0]).toMatchObject({
      itemName: "Sugar",
      previousPaise: 1050,
      latestPaise: 1200,
    });
  });

  it("returns zeroes and no alerts for an empty month", async () => {
    const data = await getDashboard(db!, "2026-10");
    expect(data.purchasesPaise).toBe(0);
    expect(data.expensesPaise).toBe(0);
    expect(data.stockValuePaise).toBe(0);
    expect(data.lowStock).toEqual([]);
    expect(data.priceAlerts).toEqual([]);
  });
});
