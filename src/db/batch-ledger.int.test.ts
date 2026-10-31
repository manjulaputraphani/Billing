/**
 * Lot-wise (per-batch) ledger — end to end against the real schema, under FIFO
 * costing. Mirrors the shop owner's scenario:
 *   - buy Product A 100 kg @ ₹100/kg
 *   - buy Product A  60 kg @ ₹110/kg
 *   - sell 80 kg @ ₹120/kg   → all from the ₹100 lot, 20 kg of it left
 *   - sell 60 kg @ ₹130/kg   → 20 kg from ₹100 lot + 40 kg from ₹110 lot
 * The ledger must report per-lot sold qty, sold value, profit and pending.
 *
 * Needs DATABASE_URL_TEST (a dedicated test database) — skips otherwise.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { resetAll, setupTestDb, testDbUrl } from "./test-utils";
import { createItem } from "./items";
import { addPurchase } from "./purchases";
import { createSaleBill } from "./billing";
import { setCostingMethod } from "./costing";
import { batchLedger } from "./reports";

const db = await setupTestDb();
const suite = db ? describe : describe.skip;

suite("batchLedger — per-lot sold/profit/pending (FIFO)", () => {
  beforeEach(async () => {
    if (db) await resetAll(db);
  });

  it(
    "owner scenario: 100 kg @ ₹100, 60 kg @ ₹110, sell 80 then 60",
    { timeout: 60_000 },
    async () => {
      const url = testDbUrl();
      if (!url || !db) return;

      // FIFO costing so profit is the real per-batch cost, not a blend.
      await setCostingMethod(db, "FIFO");

      const item = await createItem(db, { name: "Product A", unit: "kg", minStockBase: 0 });

      // Buy 100 kg @ ₹100/kg.
      await addPurchase(db, {
        itemId: item.id,
        qty: 100,
        unitPricePaise: 10_000,
        date: "2026-10-01",
      });
      // Buy 60 kg @ ₹110/kg.
      await addPurchase(db, {
        itemId: item.id,
        qty: 60,
        unitPricePaise: 11_000,
        date: "2026-10-02",
      });

      // Sale 1: 80 kg @ ₹120/kg → ₹9600, all from lot A, cost ₹8000, profit ₹1600.
      await createSaleBill(url, {
        date: "2026-10-05",
        paymentMode: "Cash",
        lines: [{ itemId: item.id, qtyBase: 80_000, unitPricePaise: 12_000 }],
      });
      // Sale 2: 60 kg @ ₹130/kg → ₹7800, 20 kg from A + 40 kg from B.
      await createSaleBill(url, {
        date: "2026-10-06",
        paymentMode: "Cash",
        lines: [{ itemId: item.id, qtyBase: 60_000, unitPricePaise: 13_000 }],
      });

      const ledger = await batchLedger(db, item.id);
      expect(ledger.itemName).toBe("Product A");
      expect(ledger.unit).toBe("kg");
      expect(ledger.batches).toHaveLength(2);

      const [lotA, lotB] = ledger.batches;

      // Lot A: 100 kg bought, all sold, nothing pending.
      expect(lotA.qtyOriginal).toBe(100_000);
      expect(lotA.qtySold).toBe(100_000);
      expect(lotA.qtyRemaining).toBe(0);
      expect(lotA.unitPricePaise).toBe(10_000);
      expect(lotA.cogsPaise).toBe(1_000_000); // ₹8000 + ₹2000
      // ₹9600 (all of sale 1) + ₹2600 share of sale 2 (7800 * 20000/60000).
      expect(lotA.soldValuePaise).toBe(1_220_000);
      expect(lotA.profitPaise).toBe(220_000); // ₹1600 + ₹600
      expect(lotA.pendingValuePaise).toBe(0);
      expect(lotA.sales).toHaveLength(2);

      // Lot B: 60 kg bought, 40 kg sold, 20 kg pending.
      expect(lotB.qtyOriginal).toBe(60_000);
      expect(lotB.qtySold).toBe(40_000);
      expect(lotB.qtyRemaining).toBe(20_000);
      expect(lotB.unitPricePaise).toBe(11_000);
      expect(lotB.cogsPaise).toBe(440_000); // 40 kg @ ₹110
      // ₹5200 share of sale 2 (7800 * 40000/60000).
      expect(lotB.soldValuePaise).toBe(520_000);
      expect(lotB.profitPaise).toBe(80_000); // ₹5200 − ₹4400
      expect(lotB.pendingValuePaise).toBe(220_000); // 20 kg @ ₹110
      expect(lotB.sales).toHaveLength(1);

      // The lot-B sale line should name bill 2 and show 40 kg taken at ₹130/kg.
      const [bSale] = lotB.sales;
      expect(bSale.qtyTaken).toBe(40_000);
      expect(bSale.unitPricePaise).toBe(13_000);
      expect(bSale.cogsPaise).toBe(440_000);
      expect(bSale.profitPaise).toBe(80_000);
    },
  );
});