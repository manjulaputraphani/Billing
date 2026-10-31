# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 20:21 by GLM-5.2 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Coffee theme, FY reports, sessions, customer master, lot-wise ledger, tidy Dashboard/New Bill,
and a labelled Stock Check with a **Recent entries** table.

## Done this session — T-1..T-3 + UI + Stock Check
- **Lot-wise ledger**: `batchLedger` in `src/db/reports.ts`, endpoint
  `/api/items/:id/batches/ledger`, web Items → **Lots** panel.
- **Dashboard**: stat grid 3 cols; **Quick expense** card; EmptyState fixed (min-h, 12px
  gap, pt/pb-6, smaller icon, clean ₹ glyph).
- **New Bill**: two-column invoice layout (Customer + Items cards, sticky Summary with live
  totals). Quick-expense Add button aligned (h-full).
- **Stock Check**: small `<label>`s above Item / Type / Quantity / Note; select left padding
  now equals inputs (`select.input` appearance:none + theme chevron in styles.css); current
  stock + unit shown next to Quantity; **Recent entries** table (date, item, type, quantity,
  note, user) via new `GET /api/stock` (user recovered from activity_log by item+event order).
- `npx tsc --noEmit` clean (root + web + worker); `cd web && npm run build` ok; 244 tests green.

## Live / deployment
- **Deployed 2026-10-31 20:21** — Stock Check live (version e574c744, bundle BoF3sCgL).
  Earlier today: New Bill (098bcc10), EmptyState (058064c5), UI tidy (a0fb2bab), Lots (2280b4cf).
- Worker `sdhhe-api`: assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy` (wrangler 4.86 / Node 20).
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. Optional email: `RESEND_API_KEY` / `MAIL_FROM`
  (or AES-GCM `resend_api_key_enc` in Settings). DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## Next tasks (priority)
1. **Desktop parity**: Lots tab, labelled Stock Check + Recent entries, New Bill layout.
2. T-4 lot-wise FY report; T-5 sale preview batch breakdown.
3. Add `web/public/assets/login-bg.webp`; enable email; rotate owner password; save
   Playwright suites; link purchase/sale expenses in UI. Desktop-only: AI, print/PDF,
   Excel, offline, auto-update, keychain · V2-P12/P14/P16.

## Commands
- Web local: `cd web-worker && ./node_modules/.bin/wrangler dev` (:8787) · `cd web && npm
  run dev` (:5173) · `cd web && npm run typecheck`
- Tests: `npx vitest run --reporter=dot` (244 green) · `npm run test:db` (needs
  DATABASE_URL_TEST) · `npx tsc --noEmit` clean (root + web + worker)