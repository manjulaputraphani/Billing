import { beforeEach, describe, expect, it } from "vitest";
import { resetAll, setupTestDb } from "./test-utils";
import { createItem, deleteItem, listItems } from "./items";
import { purchases } from "./schema";

const db = await setupTestDb();
const suite = db ? describe : describe.skip;

suite("B5 — delete item with purchases", () => {
  beforeEach(async () => {
    if (db) await resetAll(db);
  });

  it("blocks deletion with 'Item has purchases'", async () => {
    const item = await createItem(db!, { name: "Rice", unit: "kg", minStockBase: 0 });

    await db!.insert(purchases).values({
      itemId: item.id,
      qtyBase: 1000,
      unitPricePaise: 1000,
      totalPaise: 1000,
      purchaseDate: "2026-10-30",
    });

    await expect(deleteItem(db!, item.id)).rejects.toThrow("Item has purchases");

    const rows = await listItems(db!);
    expect(rows.map((r) => r.name)).toContain("Rice");
  });

  it("deletes an item that has no purchases", async () => {
    const item = await createItem(db!, { name: "Salt", unit: "kg", minStockBase: 0 });
    await deleteItem(db!, item.id);
    expect(await listItems(db!)).toHaveLength(0);
  });
});
