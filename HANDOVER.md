# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 19:56 by GLM-5.2 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Coffee theme, FY reports, login sessions, customer master. NEW: lot-wise per-batch
ledger — backend + endpoint (T-2) and web UI (T-3).

## Done this session — T-1 + T-2 + T-3 (lot-wise batch tracking)
- Owner need: same item bought at two prices on different days → track per lot what sold
  for how much, profit, and what's pending. Data model already supported it (batches +
  movement_batch_links + sale_items.costPaise/profitPaise).
- **T-1 (test)**: `src/logic/sales.test.ts` — pure-logic test for the exact owner scenario
  (100 kg@₹100, 60 kg@₹110, sell 80 then 60). 7 tests.
- **T-2 (backend)**: `batchLedger(db, itemId)` in `src/db/reports.ts` — per batch: qty
  bought/sold/remaining, sold value (revenue attributed by qty share), COGS, profit,
  pending value + the individual sales. Excludes cancelled bills. Int test
  `src/db/batch-ledger.int.test.ts` (skips without DATABASE_URL_TEST). Endpoint
  `GET /api/items/:id/batches/ledger`.
- **T-3 (web UI)**: Items page → **Lots** button per row opens an inline ledger panel:
  Lot# | Purchased | Supplier | Bought | Unit cost | Sold qty | Sold value | Profit |
  Pending | Pending value. Row expands to the individual sales (bill, date, customer,
  qty from this lot, rate, revenue share, COGS, profit). Types + `api.batchLedger` in
  `web/src/api.ts`; panel in `web/src/App.tsx`. Profit green/red via text-success-ink /
  text-error-ink.
- `npx tsc --noEmit` clean (root + web + worker). `cd web && npm run build` ok.
  `npx vitest run` = 244 green.
- NOT done: (a) **flip Settings → Costing → FIFO** in the live app so profit is per-batch
  not WAC blend (one runtime setting, owner action); (b) desktop Item-detail Lots tab;
  (c) T-4 lot-wise FY report; (d) T-5 sale preview batch breakdown.

## Live / deployment
- Worker `sdhhe-api`: static assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy` (wrangler 4.86 / Node 20).
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. Optional email: `RESEND_API_KEY` / `MAIL_FROM`
  (or AES-GCM `resend_api_key_enc` in Settings). DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## Next tasks (priority)
1. **Owner: flip Settings → Costing → FIFO** so per-batch profit is real (not WAC blend).
2. **Deploy** web (Lots panel) — `cd web && npm run build` then `wrangler deploy`.
3. **Desktop Lots tab**: mirror the web panel in `src/` Item detail.
4. Add `web/public/assets/login-bg.webp`; enable email; rotate owner password; save
   Playwright suites. Link purchase/sale expenses in UI. Desktop-only: AI, print/PDF,
   Excel, offline, auto-update, keychain · V2-P12/P14/P16.

## Commands
- Web local: `cd web-worker && ./node_modules/.bin/wrangler dev` (:8787) · `cd web && npm
  run dev` (:5173) · `cd web && npm run typecheck`
- Tests: `npx vitest run --reporter=dot` (244 green) · `npm run test:db` (needs
  DATABASE_URL_TEST) · `npx tsc --noEmit` clean (root + web + worker)
