import { and, asc, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { withTransaction } from "./client";
import { batches, items, movementBatchLinks, sales, stockMovements } from "./schema";
import { planSale } from "../logic/sales";
import { baseFactor, type Unit } from "../logic/units";
import type { Db } from "./client";

export const saleSchema = z.object({
  itemId: z.number({ message: "Choose an item" }).int().positive("Choose an item"),
  qty: z.number({ message: "Enter a quantity" }).int().positive("Quantity must be a positive whole number"),
  unitPricePaise: z.number().int().nonnegative("Price cannot be negative"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
  note: z.string().trim().max(200, "Note is too long").optional(),
});

export type SaleInput = z.infer<typeof saleSchema>;

export function parseSale(input: unknown): SaleInput {
  const result = saleSchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid sale");
  }
  return result.data;
}

export type SaleSaveResult = {
  saleId: number;
  movementId: number;
  qtyBase: number;
  revenuePaise: number;
  costPaise: number;
  leftQty: number;
};

/**
 * Record a sale as ONE transaction: take the quantity from the oldest batches,
 * write the SALE stock movement + batch links, then the sales row. Stock left
 * (sum of open batches) drops automatically everywhere.
 */
export async function saveSale(url: string, input: unknown): Promise<SaleSaveResult> {
  const data = parseSale(input);

  return withTransaction(url, async (tx) => {
    const [item] = await tx
      .select({ id: items.id, unit: items.unit })
      .from(items)
      .where(eq(items.id, data.itemId));
    if (!item) throw new Error("Item not found");

    const factor = baseFactor(item.unit as Unit);

    // Lock this item's open batches so two sales cannot double-spend stock.
    const open = await tx
      .select({
        id: batches.id,
        qtyRemaining: batches.qtyRemaining,
        unitPricePaise: batches.unitPricePaise,
        purchaseDate: batches.purchaseDate,
      })
      .from(batches)
      .where(and(eq(batches.itemId, data.itemId), gt(batches.qtyRemaining, 0)))
      .orderBy(asc(batches.purchaseDate), asc(batches.id))
      .for("update");

    const plan = planSale(open, data.qty, data.unitPricePaise, factor);

    for (const row of plan.remaining) {
      const before = open.find((b) => b.id === row.id)?.qtyRemaining;
      if (before !== row.qtyRemaining) {
        await tx.update(batches).set({ qtyRemaining: row.qtyRemaining }).where(eq(batches.id, row.id));
      }
    }

    const note = data.note?.trim() || null;

    const [movement] = await tx
      .insert(stockMovements)
      .values({
        itemId: data.itemId,
        type: "SALE",
        qtyChange: -data.qty,
        costPaise: plan.totalCostPaise,
        enteredQtyLeft: null,
        movementDate: data.date,
        note,
      })
      .returning({ id: stockMovements.id });

    if (plan.takes.length > 0) {
      await tx.insert(movementBatchLinks).values(
        plan.takes.map((take) => ({
          movementId: movement.id,
          batchId: take.batchId,
          qtyTaken: take.qty,
          unitPricePaise: take.unitPricePaise,
          costPaise: take.costPaise,
        })),
      );
    }

    const [sale] = await tx
      .insert(sales)
      .values({
        itemId: data.itemId,
        movementId: movement.id,
        qtyBase: data.qty,
        unitPricePaise: data.unitPricePaise,
        totalPaise: plan.revenuePaise,
        soldAt: data.date,
        note,
      })
      .returning({ id: sales.id });

    return {
      saleId: sale.id,
      movementId: movement.id,
      qtyBase: data.qty,
      revenuePaise: plan.revenuePaise,
      costPaise: plan.totalCostPaise,
      leftQty: plan.leftQty,
    };
  });
}

export type SaleRow = {
  id: number;
  itemId: number;
  itemName: string;
  unit: string;
  qtyBase: number;
  unitPricePaise: number;
  totalPaise: number;
  soldAt: string;
  note: string | null;
};

/** Newest sales first, joined with the item name for display. */
export async function listSales(db: Db, limit = 50): Promise<SaleRow[]> {
  return db
    .select({
      id: sales.id,
      itemId: sales.itemId,
      itemName: items.name,
      unit: items.unit,
      qtyBase: sales.qtyBase,
      unitPricePaise: sales.unitPricePaise,
      totalPaise: sales.totalPaise,
      soldAt: sales.soldAt,
      note: sales.note,
    })
    .from(sales)
    .innerJoin(items, eq(sales.itemId, items.id))
    .orderBy(desc(sales.soldAt), desc(sales.id))
    .limit(limit);
}
