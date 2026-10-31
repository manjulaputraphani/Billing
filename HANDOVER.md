# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 23:38 by GLM-5.2 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Coffee theme, FY reports, sessions, customer master, lot-wise ledger, mobile-responsive UI,
and **role-based permissions (Owner / CA / Staff)**.

## Done this session
- **RBAC**: `src/logic/permissions.ts` (13 modules × view/create/edit/delete/export; defaults
  Owner all, CA view+export on finance + view on items/customers/stock, Staff view+create on
  billing/purchases/expenses/stock/customers + view on bills/items). `role_permissions` table
  (`src/db/permissions.ts`) with defaults as fallback; `app_users.role` now includes `ca` and
  `access_until` date. Live DB altered with a one-off SQL script (drizzle push still errors).
- **API**: central `routePermission()` guard returns 403 on every route by module+action;
  `/api/auth/login|me` return `permissions`; access-until enforced on login + every request
  (session `until`), expired accounts auto-set inactive; `/api/roles` GET/POST owner-only;
  user create accepts role + access-until; last-active-owner guard on role change/disable;
  permission changes logged (`permissions.update`).
- **UI**: sidebar filtered by view; action buttons hidden by permission (New Bill, Purchases,
  Stock, Expenses, Customers, Items, Invoices, Investments, Settings, Team); initial view
  redirects to the first allowed tab; global data load only fetches permitted modules.
- **Team page**: Members / Roles & permissions tabs (roles tab owner-only) with a checkbox
  grid for CA + Staff (Owner read-only); Add member Role (Staff/CA/Owner) + optional Access
  until; CA role pill (calculator icon); role select disabled + Disable hidden for owners.
- `npx tsc --noEmit` clean (root + web + worker); `npx vitest run` = 248 green (added
  permissions tests + int test); `cd web && npm run build` ok.

## Live / deployment
- **Deployed 2026-10-31 23:38** — RBAC live (version 6ad2069c, bundle Cy5q1SPZ / CEYERYce).
- Worker `sdhhe-api`: assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy`.
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## Next tasks (priority)
1. Verify live: Team → Roles & permissions; add a CA member with Access until; check tabs/API.
2. **Desktop parity** for RBAC (the desktop still uses role owner/staff).
3. Decide whether Delivery is charged into the invoice total (currently expense-only).
4. T-4 lot-wise FY report; T-5 sale preview batch breakdown. Add `login-bg.webp`; enable email;
   rotate owner password; save Playwright suites. Desktop-only: AI, print/PDF, Excel, offline,
   auto-update, keychain · V2-P12/P14/P16.

## Commands
- Web local: `cd web-worker && ./node_modules/.bin/wrangler dev` (:8787) · `cd web && npm
  run dev` (:5173) · `cd web && npm run typecheck`
- Tests: `npx vitest run --reporter=dot` (248 green) · `npm run test:db` (needs
  DATABASE_URL_TEST) · `npx tsc --noEmit` clean (root + web + worker)