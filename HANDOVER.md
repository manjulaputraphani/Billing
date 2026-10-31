# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 20:56 by GLM-5.2 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Coffee theme, FY reports, sessions, customer master, lot-wise ledger, Dashboard polish,
refined New Bill/Stock Check/Purchases, and a polished Team page.

## Done this session
- **Team page**: `formatDuration` → whole units ("2h 5m", "50m 45s", 0 → "0m") in both
  `src/db/sessions.ts` and the web copy; fixed the `least(null, cap)` Postgres bug that gave
  users with no sessions 12h (now `coalesce(extract(…), 0)`); "Online now" green dot when
  last login > last logout; circular initials avatars; role pills (crown Owner / user Staff);
  masked phones "75692•••57"; **Usage** (bar-chart), **Members** (users), **Add member**
  (user-plus) card titles; Add member labels + icons (user/phone/lock) + Role dropdown +
  `autoComplete` off/new-password; "Reset" key-icon button with tooltip; red "Disable"
  user-x button with confirm; role/reset/disable hidden on your own row; worker now accepts
  `role` when creating a member.
- **Purchases**: subtitle, full-width labelled row with icons, live Total, saving guard,
  Recent purchases table (Rate/kg, Transport, Supplier, balanced widths).
- **Stock Check**: full-width cards, aligned table, saved actor + created_at, "Last 30 entries".
- **New Bill**: uniform controls, search-icon pickers, GST split (CGST/SGST vs IGST), sticky
  summary. **Dates**: shared `web/src/format.ts` ("31 Oct 2026", "31 Oct 2026, 8:35 PM").
- **Dashboard**: default view on load; 3-col stats; quick expense; low-stock card + list.
- `npx tsc --noEmit` clean (root + web + worker); `cd web && npm run build` ok; 244 tests green.

## Live / deployment
- **Deployed 2026-10-31 20:56** — Team page live (version 2f52e419, bundle BleOHJqP).
- Worker `sdhhe-api`: assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy`.
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## Next tasks (priority)
1. **Desktop parity**: Team page, Lots tab, Stock Check actor/time, Purchases form, New Bill.
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