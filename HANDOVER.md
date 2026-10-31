# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 20:05 by GLM-5.2 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Coffee theme, FY reports, login sessions, customer master, lot-wise per-batch ledger
(backend + web UI), and a tidier Dashboard / New Bill / Stock Check.

## Done this session — T-1 + T-2 + T-3 + UI tidy
- **T-1/T-2/T-3 lot-wise ledger**: `batchLedger` in `src/db/reports.ts`, endpoint
  `/api/items/:id/batches/ledger`, web Items → **Lots** panel (per batch bought/sold/
  profit/pending, expandable to the sales). Pure test + int test. FIFO scenario verified.
- **UI tidy (web)**: Dashboard stat grid 4→3 cols (balanced, no orphan cards); added a
  **Quick expense** card (category + amount + Add, Enter-to-save) that also refreshes the
  donut. **New Bill** regrouped into Customer / Items / Bill-details sections with labels
  and hr dividers, broke the cramped 6-col row into a 5-col row + a highlighted Total box,
  added a header "Save bill · ₹X" button, disabled Save when no lines, added Rate column
  to the line table. **Stock Check** shows open lots (id, date, qty, unit cost) under
  current stock when an item is picked.
- `npx tsc --noEmit` clean (root + web + worker); `cd web && npm run build` ok; `npx vitest
  run` = 244 green.

## Live / deployment
- **Deployed 2026-10-31 20:05** — UI tidy live on https://sdhhe-api.blvphani.workers.dev
  (version a0fb2bab). Prior deploy 19:58 (Lots panel, v2280b4cf). Owner on FIFO costing.
- Worker `sdhhe-api`: assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy` (wrangler 4.86 / Node 20).
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. Optional email: `RESEND_API_KEY` / `MAIL_FROM`
  (or AES-GCM `resend_api_key_enc` in Settings). DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## Next tasks (priority)
1. **Desktop Lots tab** + desktop UI parity for the Dashboard/New-Bill/Stock tidy.
2. T-4 lot-wise FY report; T-5 sale preview batch breakdown.
3. Add `web/public/assets/login-bg.webp`; enable email; rotate owner password; save
   Playwright suites; link purchase/sale expenses in UI. Desktop-only: AI, print/PDF,
   Excel, offline, auto-update, keychain · V2-P12/P14/P16.

## Commands
- Web local: `cd web-worker && ./node_modules/.bin/wrangler dev` (:8787) · `cd web && npm
  run dev` (:5173) · `cd web && npm run typecheck`
- Tests: `npx vitest run --reporter=dot` (244 green) · `npm run test:db` (needs
  DATABASE_URL_TEST) · `npx tsc --noEmit` clean (root + web + worker)