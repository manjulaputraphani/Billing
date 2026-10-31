# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 23:55 by GLM-5.2 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Coffee theme, FY reports, sessions, customer master, lot-wise ledger, mobile-responsive UI,
and **role-based permissions (Owner / CA / Staff) on web + desktop**.

## Done this session
- **RBAC (web + API)**: `src/logic/permissions.ts` (13 modules × view/create/edit/delete/export;
  defaults Owner all, CA view+export on finance + view on items/customers/stock, Staff
  view+create on billing/purchases/expenses/stock/customers + view on bills/items).
  `role_permissions` table (`src/db/permissions.ts`, defaults as fallback); `app_users.role`
  now includes `ca`, plus `access_until`. Live DB altered with a one-off SQL script.
- **API**: central `routePermission()` guard returns 403 per module+action; `/api/auth/login|me`
  return `permissions`; access-until enforced on login + every request; expired accounts
  auto-inactive; `/api/roles` owner-only; user create accepts role + access-until; last-active-
  owner guard; permission changes logged (`permissions.update`).
- **Web UI**: sidebar filtered by view; action buttons hidden by permission; initial view
  redirects to the first allowed tab; global load only fetches permitted modules. Team page has
  Members / Roles & permissions tabs (owner-only checkbox grid), Role + Access until on add.
- **Desktop RBAC (latest)**: `Lock` loads permissions into a session cache (`setCurrentPermissions`)
  and rejects expired access; `can()` drives the sidebar (`Layout`), route guards (`Guarded`),
  and action buttons in Items / Purchases / StockCheck / Billing / Expenses. Settings now has
  Members with Role + Access until, role select, last-owner guard, and an owner-only
  Roles & permissions grid (`getRoleMatrix` / `saveRolePermissions`). `listAppUsers` lazily
  disables expired accounts.
- `npx tsc --noEmit` clean (root + web + worker); `npx vitest run` = 248 green;
  `cd web && npm run build` ok; root `npm run build` (Tauri assets) ok.

## Live / deployment
- **Web deployed 2026-10-31 23:38** — RBAC live (version 6ad2069c, bundle Cy5q1SPZ / CEYERYce).
- Worker `sdhhe-api`: assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy`.
- Desktop: build installers with `npm run tauri build` (assets in `dist/` are already rebuilt).
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## Next tasks (priority)
1. Verify live: Team → Roles & permissions; add a CA member with Access until; check tabs/API.
2. Run `npm run tauri build` and install the desktop to verify the desktop RBAC end to end.
3. Decide whether Delivery is charged into the invoice total (currently expense-only).
4. T-4 lot-wise FY report; T-5 sale preview batch breakdown. Add `login-bg.webp`; enable email;
   rotate owner password; save Playwright suites. Desktop-only: AI, print/PDF, Excel, offline,
   auto-update, keychain · V2-P12/P14/P16.

## Commands
- Web local: `cd web-worker && ./node_modules/.bin/wrangler dev` (:8787) · `cd web && npm
  run dev` (:5173) · `cd web && npm run typecheck`
- Tests: `npx vitest run --reporter=dot` (248 green) · `npm run test:db` (needs
  DATABASE_URL_TEST) · `npx tsc --noEmit` clean (root + web + worker)