# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 14:05 by MiniMax M3.1 Flash (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Both editions share the coffee theme, the weighted-average costing, FY reports and login sessions.

## Live / deployment
- Worker `sdhhe-api`: static assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy` (wrangler 4.86 works on Node 20 here).
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. Optional email: `RESEND_API_KEY` / `MAIL_FROM` (or the
  AES-GCM encrypted `resend_api_key_enc` in Settings). DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## New (2026-10-31): profit, turnover, FY, usage metrics
- **Weighted-average costing**: per item a value pool (`items.stock_value_paise`, `avg_cost_paise`).
  Purchases add value + transport/loading; sales take at the average (COGS snapshot on the sale line);
  usage/wastage and sale cancels keep the pool in step. Switch WAC/FIFO in Settings (both editions).
  Logic: `src/logic/weightedCost.ts`, `src/db/costing.ts`.
- **India FY** (1 Apr–31 Mar, label "2026-27") derived from the date — `src/logic/finYear.ts`.
- **FY report** (web *Reports* tab + desktop *Reports* page): turnover (excl. GST, less discounts),
  total purchases, gross profit, net profit, closing stock qty/value/avg cost, per-deal profit.
  `src/db/reports.ts`. Worker: `/api/reports/fin-year|fin-years|deals`.
- **Expenses** now carry a type: purchase (into stock cost) / sale (onto the deal) / general.
  Purchases have a "Transport ₹" field, bills a "Delivery ₹" field (both editions).
- **Login sessions** (`user_sessions`) + `user.login` / `user.logout` in the activity log (actor = the
  member's name); per-member sessions, active time and last login in web *Team → Usage*.
  `src/db/sessions.ts`. The Activity list now **refetches when the tab is opened** (it used to load
  once at sign-in, so a colleague's sign-in stayed invisible) and has a Refresh button.
  **Session length = 12 h** (`SESSION_MAX_SECONDS`, shared by the worker and the metrics): the web
  token/cookie expires after 12 h, a new sign-in closes the previous session, and an open session is
  capped at 12 h so it never shows as "still active" forever. The desktop app has no timeout — it
  stays signed in until Settings → Lock now (or the app is closed).
- DB migrated additively (new columns + `user_sessions`); cost pools backfilled from open batches.
  Required test case verified: avg ₹102.33/kg, gross ₹153.33, net ₹113.33, 280 kg left.

## Theme (2026-10-31)
- Palette = CSS variables → `<html data-theme>` + Tailwind v4 `@theme inline`; shared engine in
  `src/lib/theme.ts` / `src/components/ThemeToggle.tsx`; light/dark/system, no flash, 200 ms fade.

## Next tasks (priority)
1. **Enable email**: Resend key + MAIL_FROM → Send test; desktop Gmail app password → Send test.
2. **Rotate the owner password** (short/exposed) via Team → Reset password.
3. Save the Playwright suites into the repo (`web/tests/`) — they currently live only in TMPDIR.
4. Fix the PRE-EXISTING tsc errors: `src/db/users.ts` `createAppUser().returning()` misses `pending`
   (same in `src/App.test.tsx`, `src/pages/Lock.test.tsx`, `src/pages/Settings.test.tsx`); the worker
   also has `pending`, `Uint8Array` and `notify` type errors (`web-worker/tsconfig.json` added).
5. Link purchase/sale expenses to their purchase/deal in the UI (the DB columns exist; the forms only
   set the type) · `tablesFilter` guard in drizzle.config; drop the interim `sales` table.
6. Desktop-only features still missing in the web app: Suggestions/Ask AI (Ollama), print/Save-as-PDF,
   Excel export, offline, auto-update, keychain setup. Desktop analytics (PLAN_ANALYTICS) + V2-P12
   pack units / WhatsApp, V2-P14 barcode, V2-P16 multi-location + accountant export.

## Commands
- Web local: `cd web-worker && ./node_modules/.bin/wrangler dev` (:8787 = web/dist + API) ·
  `cd web && npm run dev` (:5173) · `cd web && npm run typecheck`
- Tests: `npx vitest run --reporter=dot` (237 green) · `npx tsc --noEmit` (8 pre-existing errors)
- e2e skipped (no DATABASE_URL_TEST). The Neon **WebSocket** pool cannot open connections in this
  sandbox → billing/stock-write paths can only be exercised on the user's machine or in Workers.
