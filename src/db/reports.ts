/**
 * Financial-year reports: turnover, purchases, gross profit, net profit and
 * closing stock (India FY: 1 April → 31 March).
 *
 * Money is integer paise; every figure below excludes GST.
 */
import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import type { Db } from "./client";
import { batches, customers, expenses, items, purchases, saleBills, saleItems } from "./schema";
import { finYearRange, listFinYearLabels } from "../logic/finYear";
import { baseFactor, type Unit } from "../logic/units";

export type ClosingStockRow = {
  itemId: number;
  name: string;
  unit: string;
  qtyBase: number;
  valuePaise: number;
  avgCostPaise: number;
};

export type FinYearReport = {
  finYear: string;
  startDate: string;
  endDate: string;
  /** Sales value minus discounts (GST excluded). */
  turnoverPaise: number;
  discountsPaise: number;
  gstPaise: number;
  salesCount: number;
  purchaseValuePaise: number;
  purchaseExpensesPaise: number;
  totalPurchasesPaise: number;
  /** Cost of goods sold (snapshot of the average cost at the time of the sale). */
  cogsPaise: number;
  grossProfitPaise: number;
  saleExpensesPaise: number;
  generalExpensesPaise: number;
  netProfitPaise: number;
  closingStock: ClosingStockRow[];
  closingStockQtyBase: number;
  closingStockValuePaise: number;
};

export type DealLineProfit = {
  itemName: string;
  qtyBase: number;
  unit: string;
  ratePaise: number;
  avgCostPaise: number;
  saleValuePaise: number;
  cogsPaise: number;
  profitPaise: number;
  profitPercent: number;
};

export type DealProfit = {
  saleId: number;
  billNo: string;
  date: string;
  customerName: string | null;
  saleValuePaise: number;
  discountPaise: number;
  cogsPaise: number;
  grossProfitPaise: number;
  saleExpensesPaise: number;
  netProfitPaise: number;
  profitPercent: number;
  lines: DealLineProfit[];
};

/** Profit % of a deal (net profit on the sale value). */
export function profitPercent(netPaise: number, saleValuePaise: number): number {
  if (saleValuePaise === 0) return 0;
  return Math.round((netPaise * 100) / saleValuePaise);
}

/** The FY report for one financial year. */
export async function finYearReport(db: Db, label: string): Promise<FinYearReport> {
  const { startDate, endDate } = finYearRange(label);
  const inRange = and(gte(saleBills.saleDate, startDate), lte(saleBills.saleDate, endDate));

  const [sales] = await db
    .select({
      turnoverPaise: sql<number>`coalesce(sum(${saleBills.subtotalPaise} - ${saleBills.discountPaise}), 0)`.mapWith(Number),
      discountsPaise: sql<number>`coalesce(sum(${saleBills.discountPaise}), 0)`.mapWith(Number),
      gstPaise: sql<number>`coalesce(sum(${saleBills.gstPaise}), 0)`.mapWith(Number),
      saleExpensesPaise: sql<number>`coalesce(sum(${saleBills.saleExpensesPaise}), 0)`.mapWith(Number),
      salesCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(saleBills)
    .where(and(inRange, eq(saleBills.cancelled, false)));

  const [cogs] = await db
    .select({ cogsPaise: sql<number>`coalesce(sum(${saleItems.costPaise}), 0)`.mapWith(Number) })
    .from(saleItems)
    .innerJoin(saleBills, eq(saleItems.saleId, saleBills.id))
    .where(and(inRange, eq(saleBills.cancelled, false)));

  const [buy] = await db
    .select({
      purchaseValuePaise: sql<number>`coalesce(sum(${purchases.totalPaise}), 0)`.mapWith(Number),
      purchaseExpensesPaise: sql<number>`coalesce(sum(${purchases.expensesPaise}), 0)`.mapWith(Number),
    })
    .from(purchases)
    .where(and(gte(purchases.purchaseDate, startDate), lte(purchases.purchaseDate, endDate)));

  // Sale expenses that are not attached to a deal are counted on their own.
  const [standaloneSale] = await db
    .select({ amountPaise: sql<number>`coalesce(sum(${expenses.amountPaise}), 0)`.mapWith(Number) })
    .from(expenses)
    .where(
      and(
        eq(expenses.expenseType, "sale"),
        isNull(expenses.relatedSaleId),
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate),
      ),
    );

  // Purchase expenses that are not attached to a purchase are counted on their
  // own (the ones linked to a purchase are already inside purchases.expenses_paise).
  const [standalonePurchase] = await db
    .select({ amountPaise: sql<number>`coalesce(sum(${expenses.amountPaise}), 0)`.mapWith(Number) })
    .from(expenses)
    .where(
      and(
        eq(expenses.expenseType, "purchase"),
        isNull(expenses.relatedPurchaseId),
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate),
      ),
    );

  const [general] = await db
    .select({ amountPaise: sql<number>`coalesce(sum(${expenses.amountPaise}), 0)`.mapWith(Number) })
    .from(expenses)
    .where(
      and(
        eq(expenses.expenseType, "general"),
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate),
      ),
    );

  const closingStock = await closingStockRows(db);

  const grossProfitPaise = sales.turnoverPaise - cogs.cogsPaise;
  const saleExpensesPaise = sales.saleExpensesPaise + standaloneSale.amountPaise;
  const purchaseExpensesPaise = buy.purchaseExpensesPaise + standalonePurchase.amountPaise;
  const netProfitPaise = grossProfitPaise - saleExpensesPaise - general.amountPaise;

  return {
    finYear: label,
    startDate,
    endDate,
    turnoverPaise: sales.turnoverPaise,
    discountsPaise: sales.discountsPaise,
    gstPaise: sales.gstPaise,
    salesCount: sales.salesCount,
    purchaseValuePaise: buy.purchaseValuePaise,
    purchaseExpensesPaise,
    totalPurchasesPaise: buy.purchaseValuePaise + purchaseExpensesPaise,
    cogsPaise: cogs.cogsPaise,
    grossProfitPaise,
    saleExpensesPaise,
    generalExpensesPaise: general.amountPaise,
    netProfitPaise,
    closingStock,
    closingStockQtyBase: closingStock.reduce((sum, row) => sum + row.qtyBase, 0),
    closingStockValuePaise: closingStock.reduce((sum, row) => sum + row.valuePaise, 0),
  };
}

/** Stock on hand per item: quantity, value and average cost. */
export async function closingStockRows(db: Db): Promise<ClosingStockRow[]> {
  const rows = await db
    .select({
      itemId: items.id,
      name: items.name,
      unit: items.unit,
      qtyBase: sql<number>`coalesce(sum(${batches.qtyRemaining}), 0)`.mapWith(Number),
      valuePaise: sql<number>`coalesce(${items.stockValuePaise}, 0)`.mapWith(Number),
      avgCostPaise: sql<number>`coalesce(${items.avgCostPaise}, 0)`.mapWith(Number),
    })
    .from(items)
    .leftJoin(batches, eq(batches.itemId, items.id))
    .groupBy(items.id)
    .orderBy(asc(items.name));
  return rows.map((row) => ({
    ...row,
    valuePaise: row.qtyBase > 0 ? row.valuePaise : 0,
    avgCostPaise: row.qtyBase > 0 ? row.avgCostPaise : 0,
  }));
}

/** Every deal of a financial year with its profit breakdown. */
export async function dealProfits(db: Db, label: string): Promise<DealProfit[]> {
  const { startDate, endDate } = finYearRange(label);
  const bills = await db
    .select({
      id: saleBills.id,
      billNo: saleBills.billNo,
      date: saleBills.saleDate,
      customerName: customers.name,
      subtotalPaise: saleBills.subtotalPaise,
      discountPaise: saleBills.discountPaise,
      saleExpensesPaise: saleBills.saleExpensesPaise,
      cancelled: saleBills.cancelled,
    })
    .from(saleBills)
    .leftJoin(customers, eq(customers.id, saleBills.customerId))
    .where(and(gte(saleBills.saleDate, startDate), lte(saleBills.saleDate, endDate)))
    .orderBy(desc(saleBills.saleDate), desc(saleBills.id));

  const live = bills.filter((bill) => !bill.cancelled);
  if (live.length === 0) return [];
  const ids = live.map((bill) => bill.id);

  const lines = await db
    .select({
      saleId: saleItems.saleId,
      itemId: saleItems.itemId,
      itemName: items.name,
      unit: items.unit,
      qtyBase: saleItems.qtyBase,
      ratePaise: saleItems.unitPricePaise,
      avgCostPaise: saleItems.avgCostPaise,
      saleValuePaise: saleItems.lineTotalPaise,
      cogsPaise: saleItems.costPaise,
    })
    .from(saleItems)
    .innerJoin(items, eq(items.id, saleItems.itemId))
    .where(inArray(saleItems.saleId, ids))
    .orderBy(asc(saleItems.id));

  const bySale = new Map<number, DealLineProfit[]>();
  for (const line of lines) {
    const profitPaise = line.saleValuePaise - line.cogsPaise;
    const row: DealLineProfit = {
      itemName: line.itemName,
      qtyBase: line.qtyBase,
      unit: line.unit,
      ratePaise: line.ratePaise,
      avgCostPaise: line.avgCostPaise,
      saleValuePaise: line.saleValuePaise,
      cogsPaise: line.cogsPaise,
      profitPaise,
      profitPercent: profitPercent(profitPaise, line.saleValuePaise),
    };
    const list = bySale.get(line.saleId) ?? [];
    list.push(row);
    bySale.set(line.saleId, list);
  }

  return live.map((bill) => {
    const saleLines = bySale.get(bill.id) ?? [];
    const saleValuePaise = bill.subtotalPaise - bill.discountPaise;
    const cogsPaise = saleLines.reduce((sum, line) => sum + line.cogsPaise, 0);
    const grossProfitPaise = saleValuePaise - cogsPaise;
    const netProfitPaise = grossProfitPaise - bill.saleExpensesPaise;
    return {
      saleId: bill.id,
      billNo: bill.billNo,
      date: bill.date,
      customerName: bill.customerName,
      saleValuePaise,
      discountPaise: bill.discountPaise,
      cogsPaise,
      grossProfitPaise,
      saleExpensesPaise: bill.saleExpensesPaise,
      netProfitPaise,
      profitPercent: profitPercent(netProfitPaise, saleValuePaise),
      lines: saleLines,
    };
  });
}

/** Financial years that have data (plus the current one) for the FY selector. */
export async function finYearOptions(db: Db): Promise<string[]> {
  const [oldestPurchase] = await db
    .select({ date: sql<string>`min(${purchases.purchaseDate})`.mapWith(String) })
    .from(purchases);
  const [oldestSale] = await db
    .select({ date: sql<string>`min(${saleBills.saleDate})`.mapWith(String) })
    .from(saleBills);

  const dates = [oldestPurchase?.date, oldestSale?.date].filter(
    (date): date is string => Boolean(date) && date !== "",
  );
  const today = new Date().toISOString().slice(0, 10);
  const earliest = dates.length ? (dates.sort()[0] as string) : today;
  const labels = listFinYearLabels(earliest, today);
  const current = listFinYearLabels(today, today)[0];
  if (!labels.includes(current)) labels.push(current);
  return labels.reverse(); // newest first
}

/** Average cost per display unit for an item (from the value pool). */
export function avgCostPerUnit(valuePaise: number, qtyBase: number, unit: string): number {
  const factor = baseFactor(unit as Unit);
  if (qtyBase <= 0) return 0;
  return Math.round((valuePaise * factor) / qtyBase);
}
