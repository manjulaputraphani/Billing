import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { resetAll, setupTestDb, testDbUrl } from "./test-utils";
import { createItem } from "./items";
import { addPurchase } from "./purchases";
import { saveStockEntry } from "./stock";
import { batches, movementBatchLinks, stockMovements } from "./schema";

const db = await setupTestDb();
const url = testDbUrl();
const suite = db && url ? describe : describe.skip;

async function seedTwoBatches() {
  const item = await createItem(db!, { name: "Rice", unit: "kg", minStockBase: 0 });
  await addPurchase(db!, {
    itemId: item.id,
    qty: 1,
    unitPricePaise: 1000,
    date: "2026-10-01",
  });
  await addPurchase(db!, {
    itemId: item.id,
    qty: 3,
    unitPricePaise: 1200,
    date: "2026-10-02",
  });
  return item;
}

suite("B2 — stock check (worked example)", () => {
  beforeEach(async () => {
    if (db) await resetAll(db);
  });

  it("stores batch leftovers, movement cost and link rows", async () => {
    const item = await seedTwoBatches();

    const result = await saveStockEntry(url!, {
      itemId: item.id,
      type: "STOCK_CHECK",
      enteredLeft: 2000,
      date: "2026-10-05",
    });

    expect(result.used).toBe(2000);
    expect(result.costPaise).toBe(2200);

    const batchRows = await db!
      .select()
      .from(batches)
      .orderBy(batches.id);
    expect(batchRows.map((b) => b.qtyRemaining)).toEqual([0, 2000]);

    const movements = await db!
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.type, "STOCK_CHECK"));
    expect(movements).toHaveLength(1);
    expect(movements[0].costPaise).toBe(2200);
    expect(movements[0].qtyChange).toBe(-2000);
    expect(movements[0].enteredQtyLeft).toBe(2000);

    const links = await db!.select().from(movementBatchLinks);
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.costPaise).sort((a, b) => a - b)).toEqual([1000, 1200]);
  });

  it("records a check with nothing used", async () => {
    const item = await seedTwoBatches();

    const result = await saveStockEntry(url!, {
      itemId: item.id,
      type: "STOCK_CHECK",
      enteredLeft: 4000,
      date: "2026-10-05",
    });

    expect(result.used).toBe(0);
    const batchRows = await db!.select().from(batches).orderBy(batches.id);
    expect(batchRows.map((b) => b.qtyRemaining)).toEqual([1000, 3000]);
    expect(await db!.select().from(movementBatchLinks)).toHaveLength(0);
  });
});

suite("B4 — failure mid-transaction", () => {
  beforeEach(async () => {
    if (db) await resetAll(db);
  });

  it("rolls back the batch updates when a later insert fails", async () => {
    const item = await seedTwoBatches();

    // "2026-02-31" passes the shape check but Postgres rejects the date, which
    // fails AFTER the batch rows have been updated inside the transaction.
    await expect(
      saveStockEntry(url!, {
        itemId: item.id,
        type: "STOCK_CHECK",
        enteredLeft: 2000,
        date: "2026-02-31",
      }),
    ).rejects.toThrow();

    const batchRows = await db!.select().from(batches).orderBy(batches.id);
    expect(batchRows.map((b) => b.qtyRemaining)).toEqual([1000, 3000]);

    const checks = await db!
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.type, "STOCK_CHECK"));
    expect(checks).toHaveLength(0);
  });
});
