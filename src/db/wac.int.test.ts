/**
 * Weighted-average costing + profit, end to end against the real schema.
 *
 * Needs DATABASE_URL_TEST (a dedicated test database) — the suite skips
 * otherwise. Follows the same pattern as the other *.int.test.ts files.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { resetAll, setupTestDb, testDbUrl } from "./test-utils";
import { createItem } from "./items";
import { addPurchase } from "./purchases";
import { createSaleBill } from "./billing";
import { getCostPool } from "./costing";
import { items, saleItems } from "./schema";

const db = await setupTestDb();
const suite = db ? describe : describe.skip;

suite("weighted average cost — profit and turnover", () => {
  beforeEach(async () => {
    if (db) await resetAll(db);
  });

  it(
    "keeps the average cost after two purchases and one sale",
    { timeout: 60_000 },
    async () => {
      const url = testDbUrl();
      if (!url || !db) return;

      const item = await createItem(db, { name: "Coffee Beans", unit: "kg", minStockBase: 0 });

      // Buy 100 kg @ ₹100.
      await addPurchase(db, {
        itemId: item.id,
        qty: 100,
        unitPricePaise: 10_000,
        date: "2026-08-01",
      });
      // Buy 200 kg @ ₹102 with ₹300 transport.
      await addPurchase(db, {
        itemId: item.id,
        qty: 200,
        unitPricePaise: 10_200,
        expensesPaise: 30_000,
        date: "2026-08-02",
      });

      const pool = await getCostPool(db, item.id);
      expect(pool.avgCostPaise).toBe(10_233); // ₹102.33 per kg
      expect(pool.valuePaise).toBe(3_070_000); // ₹30 700
      expect(pool.qtyBase).toBe(300_000); // 300 kg

      // Sell 20 kg @ ₹110 with ₹40 delivery.
      const bill = await createSaleBill(url, {
        date: "2026-08-05",
        paymentMode: "Cash",
        saleExpensesPaise: 4_000,
        lines: [{ itemId: item.id, qtyBase: 20_000, unitPricePaise: 11_000 }],
      });

      const [line] = await db
        .select({ cogs: saleItems.costPaise, avg: saleItems.avgCostPaise })
        .from(saleItems)
        .where(eq(saleItems.saleId, bill.saleId));

      expect(line.cogs).toBe(204_667); // COGS ₹2 046.67
      expect(line.avg).toBe(10_233); // snapshot ₹102.33 per kg

      const grossProfitPaise = 220_000 - line.cogs; // ₹2 200 sale − COGS
      expect(grossProfitPaise).toBe(15_333); // ₹153.33
      const netProfitPaise = grossProfitPaise - 4_000; // − ₹40 delivery
      expect(netProfitPaise).toBe(11_333); // ₹113.33

      const after = await getCostPool(db, item.id);
      expect(after.qtyBase).toBe(280_000); // 280 kg left
      expect(after.avgCostPaise).toBe(10_233); // still ₹102.33 per kg

      const [row] = await db.select().from(items).where(eq(items.id, item.id));
      expect(row.avgCostPaise).toBe(10_233);
      expect(row.stockValuePaise).toBe(2_865_333); // ₹28 653.33 left
    },
  );
});
