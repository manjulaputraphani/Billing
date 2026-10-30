import { relations } from "drizzle-orm/relations";
import { users, userClaims, items, stockMovements, aiSuggestions, purchases, suppliers, batches, sales, roles, roleClaims, expenses, expenseBills, productCategories, products, stockItems, productPrices, blendFormulas, blendFormulaItems, customers, customerFollowUps, customerNotes, orders, productionBatches, roastBatches, purchaseOrders, purchaseOrderItems, stockLedger, ledgers, voucherDetails, voucherHeaders, invoices, orderItems, productionBatchItems, invoiceItems, payments, userRoles, userLogins, userTokens, movementBatchLinks } from "./schema";

export const userClaimsRelations = relations(userClaims, ({one}) => ({
	user: one(users, {
		fields: [userClaims.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userClaims: many(userClaims),
	userRoles: many(userRoles),
	userLogins: many(userLogins),
	userTokens: many(userTokens),
}));

export const stockMovementsRelations = relations(stockMovements, ({one, many}) => ({
	item: one(items, {
		fields: [stockMovements.itemId],
		references: [items.id]
	}),
	sales: many(sales),
	movementBatchLinks: many(movementBatchLinks),
}));

export const itemsRelations = relations(items, ({many}) => ({
	stockMovements: many(stockMovements),
	aiSuggestions: many(aiSuggestions),
	purchases: many(purchases),
	batches: many(batches),
	sales: many(sales),
}));

export const aiSuggestionsRelations = relations(aiSuggestions, ({one}) => ({
	item: one(items, {
		fields: [aiSuggestions.itemId],
		references: [items.id]
	}),
}));

export const purchasesRelations = relations(purchases, ({one, many}) => ({
	item: one(items, {
		fields: [purchases.itemId],
		references: [items.id]
	}),
	supplier: one(suppliers, {
		fields: [purchases.supplierId],
		references: [suppliers.id]
	}),
	batches: many(batches),
}));

export const suppliersRelations = relations(suppliers, ({many}) => ({
	purchases: many(purchases),
}));

export const batchesRelations = relations(batches, ({one, many}) => ({
	purchase: one(purchases, {
		fields: [batches.purchaseId],
		references: [purchases.id]
	}),
	item: one(items, {
		fields: [batches.itemId],
		references: [items.id]
	}),
	movementBatchLinks: many(movementBatchLinks),
}));

export const salesRelations = relations(sales, ({one}) => ({
	item: one(items, {
		fields: [sales.itemId],
		references: [items.id]
	}),
	stockMovement: one(stockMovements, {
		fields: [sales.movementId],
		references: [stockMovements.id]
	}),
}));

export const roleClaimsRelations = relations(roleClaims, ({one}) => ({
	role: one(roles, {
		fields: [roleClaims.roleId],
		references: [roles.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	roleClaims: many(roleClaims),
	userRoles: many(userRoles),
}));

export const expenseBillsRelations = relations(expenseBills, ({one}) => ({
	expense: one(expenses, {
		fields: [expenseBills.expenseId],
		references: [expenses.id]
	}),
}));

export const expensesRelations = relations(expenses, ({many}) => ({
	expenseBills: many(expenseBills),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	productCategory: one(productCategories, {
		fields: [products.categoryId],
		references: [productCategories.id]
	}),
	stockItem: one(stockItems, {
		fields: [products.stockItemId],
		references: [stockItems.id]
	}),
	productPrices: many(productPrices),
	orderItems: many(orderItems),
	invoiceItems: many(invoiceItems),
}));

export const productCategoriesRelations = relations(productCategories, ({many}) => ({
	products: many(products),
}));

export const stockItemsRelations = relations(stockItems, ({many}) => ({
	products: many(products),
	purchaseOrderItems: many(purchaseOrderItems),
	stockLedgers: many(stockLedger),
	productionBatchItems: many(productionBatchItems),
}));

export const productPricesRelations = relations(productPrices, ({one}) => ({
	product: one(products, {
		fields: [productPrices.productId],
		references: [products.id]
	}),
}));

export const blendFormulaItemsRelations = relations(blendFormulaItems, ({one}) => ({
	blendFormula: one(blendFormulas, {
		fields: [blendFormulaItems.blendFormulaId],
		references: [blendFormulas.id]
	}),
}));

export const blendFormulasRelations = relations(blendFormulas, ({many}) => ({
	blendFormulaItems: many(blendFormulaItems),
	productionBatches: many(productionBatches),
}));

export const customerFollowUpsRelations = relations(customerFollowUps, ({one}) => ({
	customer: one(customers, {
		fields: [customerFollowUps.customerId],
		references: [customers.id]
	}),
}));

export const customersRelations = relations(customers, ({many}) => ({
	customerFollowUps: many(customerFollowUps),
	customerNotes: many(customerNotes),
	orders: many(orders),
	invoices: many(invoices),
	payments: many(payments),
}));

export const customerNotesRelations = relations(customerNotes, ({one}) => ({
	customer: one(customers, {
		fields: [customerNotes.customerId],
		references: [customers.id]
	}),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	customer: one(customers, {
		fields: [orders.customerId],
		references: [customers.id]
	}),
	invoices: many(invoices),
	orderItems: many(orderItems),
}));

export const productionBatchesRelations = relations(productionBatches, ({one, many}) => ({
	blendFormula: one(blendFormulas, {
		fields: [productionBatches.blendFormulaId],
		references: [blendFormulas.id]
	}),
	roastBatch: one(roastBatches, {
		fields: [productionBatches.roastBatchId],
		references: [roastBatches.id]
	}),
	productionBatchItems: many(productionBatchItems),
}));

export const roastBatchesRelations = relations(roastBatches, ({many}) => ({
	productionBatches: many(productionBatches),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({one}) => ({
	purchaseOrder: one(purchaseOrders, {
		fields: [purchaseOrderItems.purchaseOrderId],
		references: [purchaseOrders.id]
	}),
	stockItem: one(stockItems, {
		fields: [purchaseOrderItems.stockItemId],
		references: [stockItems.id]
	}),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({many}) => ({
	purchaseOrderItems: many(purchaseOrderItems),
}));

export const stockLedgerRelations = relations(stockLedger, ({one}) => ({
	stockItem: one(stockItems, {
		fields: [stockLedger.stockItemId],
		references: [stockItems.id]
	}),
}));

export const voucherDetailsRelations = relations(voucherDetails, ({one}) => ({
	ledger: one(ledgers, {
		fields: [voucherDetails.ledgerId],
		references: [ledgers.id]
	}),
	voucherHeader: one(voucherHeaders, {
		fields: [voucherDetails.voucherHeaderId],
		references: [voucherHeaders.id]
	}),
}));

export const ledgersRelations = relations(ledgers, ({many}) => ({
	voucherDetails: many(voucherDetails),
}));

export const voucherHeadersRelations = relations(voucherHeaders, ({many}) => ({
	voucherDetails: many(voucherDetails),
}));

export const invoicesRelations = relations(invoices, ({one, many}) => ({
	customer: one(customers, {
		fields: [invoices.customerId],
		references: [customers.id]
	}),
	order: one(orders, {
		fields: [invoices.orderId],
		references: [orders.id]
	}),
	invoiceItems: many(invoiceItems),
	payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
}));

export const productionBatchItemsRelations = relations(productionBatchItems, ({one}) => ({
	productionBatch: one(productionBatches, {
		fields: [productionBatchItems.productionBatchId],
		references: [productionBatches.id]
	}),
	stockItem: one(stockItems, {
		fields: [productionBatchItems.stockItemId],
		references: [stockItems.id]
	}),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({one}) => ({
	invoice: one(invoices, {
		fields: [invoiceItems.invoiceId],
		references: [invoices.id]
	}),
	product: one(products, {
		fields: [invoiceItems.productId],
		references: [products.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	customer: one(customers, {
		fields: [payments.customerId],
		references: [customers.id]
	}),
	invoice: one(invoices, {
		fields: [payments.invoiceId],
		references: [invoices.id]
	}),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
}));

export const userLoginsRelations = relations(userLogins, ({one}) => ({
	user: one(users, {
		fields: [userLogins.userId],
		references: [users.id]
	}),
}));

export const userTokensRelations = relations(userTokens, ({one}) => ({
	user: one(users, {
		fields: [userTokens.userId],
		references: [users.id]
	}),
}));

export const movementBatchLinksRelations = relations(movementBatchLinks, ({one}) => ({
	stockMovement: one(stockMovements, {
		fields: [movementBatchLinks.movementId],
		references: [stockMovements.id]
	}),
	batch: one(batches, {
		fields: [movementBatchLinks.batchId],
		references: [batches.id]
	}),
}));