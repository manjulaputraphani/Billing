# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 20:34 by GLM-5.2 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Coffee theme, FY reports, sessions, customer master, lot-wise ledger, tidy Dashboard/Stock Check,
and a refined New Bill (uniform controls, pickers, GST split).

## Done this session
- **Lot-wise ledger**: `batchLedger` + `/api/items/:id/batches/ledger` + Items **Lots** panel.
- **Dashboard**: 3-col stats; Quick expense; EmptyState fix; sidebar sticky full-height;
  chart fills card + empty message; warning/clickable low-stock card with list; relative
  activity times + lighter actor.
- **Stock Check**: labels, matched select padding (`select.input` appearance:none + chevron),
  stock next to Quantity, **Recent entries** via `GET /api/stock`.
- **New Bill (latest)**: all inputs `h-10`; Item/Qty/Rate/HSN labels `h-5` + nowrap on one
  baseline; Add button is single-line `+ Add` `h-10`; CustomerPicker/ItemPicker triggers
  `h-10 py-0` and their empty-state "?" circles now use the shared `IconSearch`; GSTIN
  placeholder "e.g. 29ABCDE1234F1Z5"; Summary shows Subtotal · GST split · Discount (−) ·
  Delivery (+) · Total, `lg:sticky lg:top-6 lg:mr-8`. GST split: same state code (first 2
  digits of shop vs customer GSTIN) → CGST+SGST, else IGST. Delivery stays an internal
  expense line (not added to the invoice total).
- `npx tsc --noEmit` clean (root + web + worker); `cd web && npm run build` ok; 244 tests green.

## Live / deployment
- **Deployed 2026-10-31 20:34** — New Bill refinements live (version 05e4b904, bundle DRuDvQuh).
- Worker `sdhhe-api`: assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy` (wrangler 4.86 / Node 20).
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. Optional email: `RESEND_API_KEY` / `MAIL_FROM`
  (or AES-GCM `resend_api_key_enc` in Settings). DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## Next tasks (priority)
1. **Desktop parity**: Lots tab, Stock Check Recent entries, New Bill layout, Dashboard polish.
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