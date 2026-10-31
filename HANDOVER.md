# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 19:50 by GLM-5.2 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Both editions share the coffee theme, weighted-average costing, FY reports, login sessions and the
customer master. NEW: lot-wise (per-batch) ledger backend + endpoint (T-2).

## Done this session — T-1 + T-2 (lot-wise batch tracking)
- Owner need: "same item bought at two prices on different days — track per lot which sold for
  how much, profit, and what's pending." Data model ALREADY supported it (batches +
  movement_batch_links + sale_items.costPaise/profitPaise). Missing piece was a per-lot view and
  FIFO costing for true per-batch profit.
- **T-1 (test)**: pure-logic test in `src/logic/sales.test.ts` for the exact owner scenario
  (100 kg@₹100, 60 kg@₹110, sell 80 then 60) — FIFO takes oldest first, real per-batch cost. 7 tests.
- **T-2 (backend)**: `batchLedger(db, itemId)` in `src/db/reports.ts` — for every batch of an item:
  qty bought / qty sold / qty remaining, sold value (revenue attributed by qty share of each sale
  line), COGS, profit, pending value, plus the individual sales that drew from it. Excludes
  cancelled bills. Integration test `src/db/batch-ledger.int.test.ts` (skips without
  DATABASE_URL_TEST). New endpoint `GET /api/items/:id/batches/ledger` in `web-worker/src/index.ts`.
- `npx tsc --noEmit` clean (root + web + worker). `npx vitest run` = 244 green.
- NOT yet done: (a) flip Settings → Costing → **FIFO** in the live app so profit is per-batch, not
  the WAC blend (one runtime setting, owner action); (b) T-3 UI table on Item detail; (c) T-4/T-5.

## Live / deployment
- Worker `sdhhe-api`: static assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy` (wrangler 4.86 works on Node 20 here).
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. Optional email: `RESEND_API_KEY` / `MAIL_FROM` (or the
  AES-GCM encrypted `resend_api_key_enc` in Settings). DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## Next tasks (priority)
1. **Owner: flip Settings → Costing → FIFO** so per-batch profit is real (not WAC blend).
2. **T-3 UI**: Item detail → Lots/Batches tab using `/api/items/:id/batches/ledger` (columns:
   Lot# | Date | Supplier | Bought | Unit cost | Sold qty | Sold value | Profit | Pending |
   Pending value; row expands to the sales). Apply on web then desktop.
3. Add `web/public/assets/login-bg.webp` (sign-in photo) — panel shows brown fallback.
4. Enable email (Resend key + MAIL_FROM → Send test); rotate owner password; save Playwright suites.
5. Link purchase/sale expenses to their purchase/deal in the UI. Desktop-only: AI, print/PDF,
   Excel export, offline, auto-update, keychain · V2-P12 pack units/WhatsApp, V2-P14 barcode.

## Commands
- Web local: `cd web-worker && ./node_modules/.bin/wrangler dev` (:8787) · `cd web && npm run dev`
  (:5173) · `cd web && npm run typecheck`
- Tests: `npx vitest run --reporter=dot` (244 green) · `npm run test:db` (needs DATABASE_URL_TEST)
  · `npx tsc --noEmit` clean (root + web + worker)
