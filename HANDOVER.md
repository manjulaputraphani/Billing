# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 21:10 by GLM-5.2 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Coffee theme, FY reports, sessions, customer master, lot-wise ledger, and a fully
mobile-responsive web UI (every list is card-stacked on phones).

## Done this session
- **Mobile pass (latest)**: converted the remaining tables to `ResponsiveTable` — Invoices,
  Items, Customers, Reports (deals + closing stock), Investments, Team Usage, Dashboard
  low-stock, New Bill line items. Lots panel keeps its expandable rows but now has a custom
  mobile card list (<640px). Fixed wrap on Customers/Team/Activity action rows. Added a
  narrow-screen `@media` to the printed/emailed bill so header/parties/bank/signature stack.
- **Shared UI**: `FormRow` (1 col mobile / 2–3 tablet / one row ≥1200px) and
  `ResponsiveTable` (table ≥640px, cards below) reused on Expenses/Purchases/Stock Check.
- **Expenses**: full-width labelled form (Date, Type, Category datalist, Amount, Paid to,
  Note) with icons; "Recent expenses" + "This month"; Note column; empty state.
- **Purchases**: subtitle, labelled icons row, live total, saving guard, Recent purchases.
- **Stock Check**: labels, saved actor + created_at, Recent entries, dates.
- **New Bill**: uniform controls, search-icon pickers, GST split (CGST/SGST vs IGST), sticky
  summary. Left column now stretches to the Summary height (`items-stretch`, Items `flex-1`,
  empty message centred); natural height on mobile. **Team**: duration/online fixes, avatars, role pills, masked phones, safer actions.
- **Dates**: `web/src/format.ts` ("31 Oct 2026", "31 Oct 2026, 8:35 PM") across the app.
- `npx tsc --noEmit` clean (root + web + worker); `cd web && npm run build` ok; 244 tests green.

## Live / deployment
- **Deployed 2026-10-31 21:10** — mobile tables live (version ceb19789, bundle CuvIZoQh /
  f_ifoKuI).
- Worker `sdhhe-api`: assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy`.
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## Next tasks (priority)
1. **Desktop parity**: Team, Lots, Stock Check, Purchases, Expenses, New Bill.
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