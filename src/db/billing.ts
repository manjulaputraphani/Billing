import { and, asc, desc, eq, gt, like } from "drizzle-orm";
import { z } from "zod";
import { withTransaction, type Db, type TxDb } from "./client";
import {
  batches,
  customers,
  items,
  movementBatchLinks,
  saleBills,
  saleItems,
  stockMovements,
} from "./schema";
import { logActivity } from "./activity";
import { PAYMENT_MODES } from "./purchases";
import { billYear, formatBillNo, nextSequence } from "../logic/billNumber";
import { lineProfit } from "../logic/profit";
import { planSale } from "../logic/sales";
import { baseFactor, formatRupees, type Unit } from "../logic/units";

export const saleLineSchema = z.object({
  itemId: z.number({ message: "Choose an item" }).int().positive("Choose an item"),
  qtyBase: z.number({ message: "Enter a quantity" }).int().positive("Quantity must be positive"),
  unitPricePaise: z.number().int().nonnegative("Price cannot be negative"),
});

export const saleBillSchema = z
  .object({
    customerId: z.number().int().positive().nullish(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
    paymentMode: z.enum(PAYMENT_MODES),
    paidPaise: z.number().int().nonnegative().optional(),
    discountPaise: z.number().int().nonnegative("Discount cannot be negative").default(0),
    gstPaise: z.number().int().nonnegative("GST cannot be negative").default(0),
    note: z.string().trim().max(200, "Note is too long").optional(),
    lines: z.array(saleLineSchema).min(1, "Add at least one item"),
  })
  .refine((v) => v.paymentMode !== "Credit" || v.customerId != null, {
    message: "Choose a customer for a credit sale",
  });

export type SaleBillInput = z.infer<typeof saleBillSchema>;

export function parseSaleBill(input: unknown): SaleBillInput {
  const result = saleBillSchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid sale");
  }
  return result.data;
}

/** Next bill number for the sale's year: SD-2026-000001, …-000002, … */
export async function nextBillNoForDate(tx: TxDb, date: string): Promise<string> {
  const year = billYear(date);
  const prefix = `SD-${year}-`;
  const [row] = await tx
    .select({ billNo: saleBills.billNo })
    .from(saleBills)
    .where(like(saleBills.billNo, `${prefix}%`))
    .orderBy(desc(saleBills.billNo))
    .limit(1);
  const highest = row ? Number(row.billNo.slice(prefix.length)) : 0;
  return formatBillNo(year, nextSequence(highest));
}

export type SaleBillResult = {
  saleId: number;
  billNo: string;
  subtotalPaise: number;
  totalPaise: number;
  profitPaise: number;
};

/**
 * Save a whole bill in ONE transaction: per line FIFO-take stock (locked rows),
 * write the SALE movement + batch links, keep cost/profit per line, then the
 * bill header. Overselling blocks that line with an item-named message.
 */
export async function createSaleBill(url: string, input: unknown): Promise<SaleBillResult> {
  const data = parseSaleBill(input);

  return withTransaction(url, async (tx) => {
    if (data.customerId != null) {
      const [customer] = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, data.customerId));
      if (!customer) throw new Error("Customer not found");
    }

    const billNo = await nextBillNoForDate(tx, data.date);

    const lines: {
      itemId: number;
      movementId: number;
      qtyBase: number;
      unitPricePaise: number;
      lineTotalPaise: number;
      costPaise: number;
      profitPaise: number;
    }[] = [];

    for (const line of data.lines) {
      const [item] = await tx
        .select({ name: items.name, unit: items.unit })
        .from(items)
        .where(eq(items.id, line.itemId));
      if (!item) throw new Error(`Item #${line.itemId} not found`);

      const factor = baseFactor(item.unit as Unit);

      // Lock this item's open batches so two bills cannot double-spend stock.
      const open = await tx
        .select({
          id: batches.id,
          qtyRemaining: batches.qtyRemaining,
          unitPricePaise: batches.unitPricePaise,
          purchaseDate: batches.purchaseDate,
        })
        .from(batches)
        .where(and(eq(batches.itemId, line.itemId), gt(batches.qtyRemaining, 0)))
        .orderBy(asc(batches.purchaseDate), asc(batches.id))
        .for("update");

      let plan;
      try {
        plan = planSale(open, line.qtyBase, line.unitPricePaise, factor);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`${item.name}: ${message}`);
      }

      for (const row of plan.remaining) {
        const before = open.find((b) => b.id === row.id)?.qtyRemaining;
        if (before !== row.qtyRemaining) {
          await tx
            .update(batches)
            .set({ qtyRemaining: row.qtyRemaining })
            .where(eq(batches.id, row.id));
        }
      }

      const [movement] = await tx
        .insert(stockMovements)
        .values({
          itemId: line.itemId,
          type: "SALE",
          qtyChange: -line.qtyBase,
          costPaise: plan.totalCostPaise,
          enteredQtyLeft: null,
          movementDate: data.date,
          note: `Bill ${billNo}`,
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

      lines.push({
        itemId: line.itemId,
        movementId: movement.id,
        qtyBase: line.qtyBase,
        unitPricePaise: line.unitPricePaise,
        lineTotalPaise: plan.revenuePaise,
        costPaise: plan.totalCostPaise,
        profitPaise: lineProfit(plan.revenuePaise, plan.totalCostPaise),
      });
    }

    const subtotalPaise = lines.reduce((sum, l) => sum + l.lineTotalPaise, 0);
    const totalPaise = subtotalPaise - data.discountPaise + data.gstPaise;
    if (totalPaise < 0) throw new Error("Discount is more than the bill");
    const paidPaise = data.paidPaise ?? (data.paymentMode === "Credit" ? 0 : totalPaise);
    if (paidPaise > totalPaise) throw new Error("Paid amount is more than the bill");

    const [bill] = await tx
      .insert(saleBills)
      .values({
        billNo,
        customerId: data.customerId ?? null,
        saleDate: data.date,
        subtotalPaise,
        discountPaise: data.discountPaise,
        gstPaise: data.gstPaise,
        totalPaise,
        paymentMode: data.paymentMode,
        paidPaise,
        note: data.note?.trim() || null,
      })
      .returning({ id: saleBills.id });

    await tx.insert(saleItems).values(lines.map((line) => ({ saleId: bill.id, ...line })));

    const profitPaise = lines.reduce((sum, l) => sum + l.profitPaise, 0);
    await logActivity(tx, {
      event: "sale.create",
      summary: `Sale ${billNo}: ${lines.length} line(s), ${formatRupees(totalPaise)}, profit ${formatRupees(
        profitPaise,
      )}`,
      entity: "sale",
      entityId: bill.id,
    });

    return { saleId: bill.id, billNo, subtotalPaise, totalPaise, profitPaise };
  });
}

export type SaleBillRow = {
  id: number;
  billNo: string;
  customerName: string | null;
  saleDate: string;
  totalPaise: number;
  paidPaise: number;
  paymentMode: string;
  cancelled: boolean;
};

/** Newest bills first, with the customer name for display. */
export async function listSaleBills(db: Db, limit = 50): Promise<SaleBillRow[]> {
  return db
    .select({
      id: saleBills.id,
      billNo: saleBills.billNo,
      customerName: customers.name,
      saleDate: saleBills.saleDate,
      totalPaise: saleBills.totalPaise,
      paidPaise: saleBills.paidPaise,
      paymentMode: saleBills.paymentMode,
      cancelled: saleBills.cancelled,
    })
    .from(saleBills)
    .leftJoin(customers, eq(saleBills.customerId, customers.id))
    .orderBy(desc(saleBills.saleDate), desc(saleBills.id))
    .limit(limit);
}

/**
 * Cancel a bill: restore each line's exact batch quantities from its SALE
 * movement links, then mark the bill cancelled. Never a hard delete.
 */
export async function cancelSaleBill(url: string, saleId: number): Promise<{ restored: number }> {
  return withTransaction(url, async (tx) => {
    const [bill] = await tx
      .select({ id: saleBills.id, billNo: saleBills.billNo, cancelled: saleBills.cancelled })
      .from(saleBills)
      .where(eq(saleBills.id, saleId))
      .for("update");
    if (!bill) throw new Error("Sale not found");
    if (bill.cancelled) throw new Error("Sale is already cancelled");

    const lines = await tx
      .select({ id: saleItems.id, movementId: saleItems.movementId })
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId));

    for (const line of lines) {
      if (line.movementId == null) continue;
      const links = await tx
        .select({ batchId: movementBatchLinks.batchId, qtyTaken: movementBatchLinks.qtyTaken })
        .from(movementBatchLinks)
        .where(eq(movementBatchLinks.movementId, line.movementId));
      for (const link of links) {
        const [batch] = await tx
          .select({ qtyRemaining: batches.qtyRemaining })
          .from(batches)
          .where(eq(batches.id, link.batchId));
        if (!batch) continue;
        await tx
          .update(batches)
          .set({ qtyRemaining: batch.qtyRemaining + link.qtyTaken })
          .where(eq(batches.id, link.batchId));
      }
    }

    await tx.update(saleBills).set({ cancelled: true }).where(eq(saleBills.id, saleId));
    await logActivity(tx, {
      event: "sale.cancel",
      summary: `Sale ${bill.billNo} cancelled; stock restored`,
      entity: "sale",
      entityId: saleId,
    });

    return { restored: lines.length };
  });
}
