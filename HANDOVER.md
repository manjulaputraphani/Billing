# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 20:41 by GLM-5.2 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Coffee theme, FY reports, sessions, customer master, lot-wise ledger, Dashboard polish,
refined New Bill (uniform controls, GST split), Stock Check with saved user + timestamps.

## Done this session
- **Lot-wise ledger**: `batchLedger` + `/api/items/:id/batches/ledger` + Items **Lots** panel.
- **Dashboard**: 3-col stats; Quick expense; EmptyState fix; sticky full-height sidebar;
  chart fills card + empty message; warning/clickable low-stock card + list; relative activity.
- **Stock Check**: labels, matched select padding, stock next to Quantity, **Recent entries**.
  Form + table cards now full width (same margins); table cells `px-4` align with the title;
  `<colgroup>` 16/24/13/15/18/14 %; "Last 30 entries"; date+time via `formatDateTime`.
- **Stock entries now save the member**: added `stock_movements.actor` + `created_at`
  (nullable) to `src/db/schema.ts`, applied to live DB with `ALTER TABLE … ADD COLUMN IF NOT
  EXISTS` (drizzle-kit push currently errors "activity_log already exists" — pre-existing).
  `saveStockEntry` writes `actor=getAuditActor().name, createdAt=new Date()`. `GET /api/stock`
  returns them (activity-log join kept only as fallback for old rows).
- **Shared date format** `web/src/format.ts`: `formatDate` → "31 Oct 2026",
  `formatDateTime` → "31 Oct 2026, 8:35 PM" (en-IN, AM/PM upper-cased, date-only parsed local).
  Applied to Stock Check, Invoices, Reports (deals + FY range), Purchases, Expenses,
  Investments, Lots panel; printed/emailed bill `billDate` now "14 May 2026".
- **New Bill**: all inputs `h-10`; Item/Qty/Rate/HSN labels aligned; single-line `+ Add`;
  pickers `h-10` with shared `IconSearch` empty state; GSTIN placeholder "e.g. 29ABCDE…";
  Summary order Subtotal · GST split · Discount (−) · Delivery (+) · Total, sticky top-6.
  GST split: same state code → CGST+SGST, else IGST. Delivery stays an internal expense.
- `npx tsc --noEmit` clean (root + web + worker); `cd web && npm run build` ok; 244 tests green.

## Live / deployment
- **Deployed 2026-10-31 20:41** — Stock Check + dates live (version e9f4779a, bundle HCbfTH1B).
- Worker `sdhhe-api`: assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy`.
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## Next tasks (priority)
1. **Desktop parity**: Lots tab, Stock Check actor/time, New Bill layout, Dashboard polish.
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