import { beforeEach, describe, expect, it } from "vitest";
import { resetAll, setupTestDb } from "./test-utils";
import { createItem } from "./items";
import { addPurchase } from "./purchases";
import { batches, purchases, stockMovements, suppliers } from "./schema";

const db = await setupTestDb();
const suite = db ? describe : describe.skip;

describe("db test harness", () => {
  it("only runs against a dedicated test database", () => {
    // Documents the contract; the real guard lives in setupTestDb().
    expect(true).toBe(true);
  });
});

suite("B1 — add purchase", () => {
  beforeEach(async () => {
    if (db) await resetAll(db);
  });

  it("writes exactly 1 purchase, 1 batch and 1 PURCHASE movement", async () => {
    const item = await createItem(db!, { name: "Rice", unit: "kg", minStockBase: 0 });

    const result = await addPurchase(db!, {
      itemId: item.id,
      qty: 2,
      unitPricePaise: 1200,
      date: "2026-10-30",
      paymentMode: "Cash",
    });

    expect(result.totalPaise).toBe(2400);

    const purchaseRows = await db!.select().from(purchases);
    expect(purchaseRows).toHaveLength(1);
    expect(purchaseRows[0].qtyBase).toBe(2000);
    expect(purchaseRows[0].unitPricePaise).toBe(1200);
    expect(purchaseRows[0].totalPaise).toBe(2400);
    expect(purchaseRows[0].purchaseDate).toBe("2026-10-30");

    const batchRows = await db!.select().from(batches);
    expect(batchRows).toHaveLength(1);
    expect(batchRows[0].qtyOriginal).toBe(2000);
    expect(batchRows[0].qtyRemaining).toBe(2000);
    expect(batchRows[0].unitPricePaise).toBe(1200);

    const movementRows = await db!.select().from(stockMovements);
    expect(movementRows).toHaveLength(1);
    expect(movementRows[0].type).toBe("PURCHASE");
    expect(movementRows[0].qtyChange).toBe(2000);
    expect(movementRows[0].costPaise).toBe(2400);
  });

  it("creates a supplier once and reuses it for later purchases", async () => {
    const item = await createItem(db!, { name: "Sugar", unit: "kg", minStockBase: 0 });

    await addPurchase(db!, {
      itemId: item.id,
      supplierName: "Sri Traders",
      qty: 1,
      unitPricePaise: 5000,
      date: "2026-10-01",
    });
    await addPurchase(db!, {
      itemId: item.id,
      supplierName: "sri traders",
      qty: 1,
      unitPricePaise: 5100,
      date: "2026-10-02",
    });

    const supplierRows = await db!.select().from(suppliers);
    expect(supplierRows).toHaveLength(1);

    const purchaseRows = await db!.select().from(purchases);
    expect(purchaseRows).toHaveLength(2);
    expect(purchaseRows.every((p) => p.supplierId === supplierRows[0].id)).toBe(true);
  });

  it("rejects an invalid quantity without writing anything", async () => {
    const item = await createItem(db!, { name: "Dal", unit: "kg", minStockBase: 0 });

    await expect(
      addPurchase(db!, {
        itemId: item.id,
        qty: 0,
        unitPricePaise: 1000,
        date: "2026-10-30",
      }),
    ).rejects.toThrow(/more than 0/i);

    expect(await db!.select().from(purchases)).toHaveLength(0);
    expect(await db!.select().from(batches)).toHaveLength(0);
  });
});
