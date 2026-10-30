import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Data model — docs/BLUEPRINT.md §4. Money is integer paise, quantity integer base units.

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  unit: text("unit").notNull(),
  category: text("category"),
  minStockBase: integer("min_stock_base").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
});

export const purchases = pgTable(
  "purchases",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    supplierId: integer("supplier_id").references(() => suppliers.id),
    qtyBase: integer("qty_base").notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    totalPaise: integer("total_paise").notNull(),
    purchaseDate: date("purchase_date").notNull(),
    paymentMode: text("payment_mode"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("purchases_qty_base_positive", sql`${t.qtyBase} > 0`),
    check("purchases_unit_price_non_negative", sql`${t.unitPricePaise} >= 0`),
  ],
);

export const batches = pgTable(
  "batches",
  {
    id: serial("id").primaryKey(),
    purchaseId: integer("purchase_id")
      .notNull()
      .unique()
      .references(() => purchases.id),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    qtyOriginal: integer("qty_original").notNull(),
    qtyRemaining: integer("qty_remaining").notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    purchaseDate: date("purchase_date").notNull(),
  },
  (t) => [check("batches_qty_remaining_non_negative", sql`${t.qtyRemaining} >= 0`)],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    type: text("type").notNull(),
    qtyChange: integer("qty_change").notNull(),
    costPaise: integer("cost_paise").notNull(),
    enteredQtyLeft: integer("entered_qty_left"),
    movementDate: date("movement_date").notNull(),
    note: text("note"),
  },
  (t) => [
    check(
      "stock_movements_type_valid",
      sql`${t.type} in ('PURCHASE','STOCK_CHECK','USAGE','WASTAGE','ADJUSTMENT','SALE')`,
    ),
  ],
);

export const movementBatchLinks = pgTable(
  "movement_batch_links",
  {
    movementId: integer("movement_id")
      .notNull()
      .references(() => stockMovements.id),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batches.id),
    qtyTaken: integer("qty_taken").notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    costPaise: integer("cost_paise").notNull(),
  },
  (t) => [primaryKey({ columns: [t.movementId, t.batchId] })],
);

export const sales = pgTable(
  "sales",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    movementId: integer("movement_id")
      .notNull()
      .references(() => stockMovements.id),
    qtyBase: integer("qty_base").notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    totalPaise: integer("total_paise").notNull(),
    soldAt: date("sold_at").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("sales_qty_positive", sql`${t.qtyBase} > 0`)],
);

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  amountPaise: integer("amount_paise").notNull(),
  expenseDate: date("expense_date").notNull(),
  paymentMode: text("payment_mode"),
  note: text("note"),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const aiSuggestions = pgTable("ai_suggestions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  itemId: integer("item_id").references(() => items.id),
  message: text("message").notNull(),
  priority: integer("priority").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  dismissed: boolean("dismissed").notNull().default(false),
});
