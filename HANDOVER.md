# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 21:00 by GLM-5.2 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Coffee theme, FY reports, sessions, customer master, lot-wise ledger, polished Dashboard/
Team/Purchases/Stock Check/New Bill, and a responsive Expenses page on shared components.

## Done this session
- **Shared UI**: `web/src/components/FormRow.tsx` (1 col mobile, 2–3 tablet, one row at
  ≥1200px) and `ResponsiveTable.tsx` (real table ≥640px, stacked cards below). Both reused
  on **Purchases** and **Stock Check**.
- **Expenses (latest)**: full-width labelled form (Date defaults today, Type, Category,
  Amount ₹, Paid to, Note + Add) with Lucide icons (calendar, tag, indian-rupee, user,
  sticky-note); Category is a datalist (Rent, Tea, Transport, Salary, Electricity, Other,
  custom allowed); **Recent expenses** title + "This month: ₹x"; Note column; empty state;
  mobile stacked cards.
- **Purchases**: subtitle, full-width form, live total, saving guard, Recent purchases table
  with Rate/kg, Transport, Supplier.
- **Stock Check**: labelled form, saved actor + created_at, Recent entries, dates.
- **New Bill**: uniform controls, search-icon pickers, GST split (CGST/SGST vs IGST), sticky
  summary. **Team**: duration/online fixes, avatars, role pills, masked phones, safer actions.
- **Dates**: `web/src/format.ts` ("31 Oct 2026", "31 Oct 2026, 8:35 PM") across the app.
- `npx tsc --noEmit` clean (root + web + worker); `cd web && npm run build` ok; 244 tests green.

## Live / deployment
- **Deployed 2026-10-31 21:00** — Expenses + shared components live (version 83dbba11,
  bundle Beq5YGNy / DJlJTasK).
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