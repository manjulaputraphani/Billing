# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 20:49 by GLM-5.2 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Coffee theme, FY reports, sessions, customer master, lot-wise ledger, Dashboard polish,
refined New Bill + Stock Check, and a redesigned Purchases page.

## Done this session
- **Lot-wise ledger**: `batchLedger` + `/api/items/:id/batches/ledger` + Items **Lots** panel.
- **Dashboard**: 3-col stats; Quick expense; EmptyState fix; sticky full-height sidebar;
  chart fills card + empty message; warning/clickable low-stock card + list; relative activity.
- **Stock Check**: labels, matched select padding, stock next to Quantity, **Recent entries**;
  full-width cards, `px-4` cells, `<colgroup>` 16/24/13/15/18/14 %, "Last 30 entries";
  `stock_movements.actor` + `created_at` saved per entry (live DB columns added).
- **Purchases (latest)**: subtitle "Record stock you buy from suppliers."; full-width form;
  one labelled row `2fr 1fr 1fr 1fr 1.2fr auto` (Item, Qty, Rate ₹, Transport ₹, Supplier)
  with Lucide icons inside the fields (package, scale, indian-rupee, truck, store); live
  `Total: ₹x` beside the Save button; Save disabled while saving; table titled **Recent
  purchases** with Date, Item, Qty, Rate/kg, Transport, Supplier, Total (balanced colgroup).
  `/api/purchases` now returns `expenses_paise` + `supplier_name`.
- **New Bill**: uniform `h-10` controls, aligned labels, `+ Add`, search-icon pickers, GSTIN
  placeholder, Summary order Subtotal · GST split · Discount (−) · Delivery (+) · Total,
  sticky top-6; CGST+SGST vs IGST by state code.
- **Shared dates** `web/src/format.ts`: "31 Oct 2026" / "31 Oct 2026, 8:35 PM"; applied across
  Stock Check, Invoices, Reports, Purchases, Expenses, Investments, Lots; printed bill date.
- `npx tsc --noEmit` clean (root + web + worker); `cd web && npm run build` ok; 244 tests green.

## Live / deployment
- **Deployed 2026-10-31 20:49** — Purchases live (version 7305cf14, bundle CMEGGSpn).
- Worker `sdhhe-api`: assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy`.
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## Next tasks (priority)
1. **Desktop parity**: Lots tab, Stock Check actor/time, Purchases form, New Bill layout.
2. Decide whether Delivery should be charged into the invoice total (currently expense-only).
3. T-4 lot-wise FY report; T-5 sale preview batch breakdown.
4. Add `web/public/assets/login-bg.webp`; enable email; rotate owner password; save Playwright
   suites; link purchase/sale expenses in UI. Desktop-only: AI, print/PDF, Excel, offline,
   auto-update, keychain · V2-P12/P14/P16.

## Commands
- Web local: `cd web-worker && ./node_modules/.bin/wrangler dev` (:8787) · `cd web && npm
  run dev` (:5173) · `cd web && npm run typecheck`
- Tests: `npx vitest run --reporter=dot` (244 green) · `npm run test:db` (needs
  DATABASE_URL_TEST) · `npx tsc --noEmit` clean (root + web + worker)