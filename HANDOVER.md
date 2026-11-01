# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-11-01 10:00 by MiMo (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
RBAC (Owner / CA / Staff) on web + desktop; macOS `.app`/`.dmg` built 2026-10-31.

## Done
- **Dashboard UI fixes (2026-11-01)**: (1) sidebar pinned — `.nav-texture` no longer sets
  `position` (it overrode Tailwind `sticky`/`fixed`); desktop rail `sticky top-0 h-screen`
  (+`100dvh` via `supports:`), nav scrolls internally (`.thin-scrollbar`), theme toggle /
  user / Sign out pinned; mobile drawer untouched. (2) Recent activity = latest 4 by query
  (`DASHBOARD_ACTIVITY_ROWS`) + "View all activity →"; Activity screen pages 20 with
  "Load more" (`listActivity(db, limit, offset)`, `/api/activity?offset=`). (3) 14-day chart
  window now IST: `today−13 … today` via `(now() at time zone 'Asia/Kolkata')::date` (was
  UTC `current_date`).
- **Chart empty = missing data, not the query** (verified read-only against the live DB):
  `sale_bills`, `sale_items`, `expenses`, `sales` all have 0 rows. The 4 bills dated
  30–31 Oct were deleted as "development data" in commit `aebc6d1` (2026-10-31 cleanup;
  customers/suppliers labelled TEST too). Restore point: `docs/db-backup-2026-10-31.sql`
  (bills SD-2026-000001…4 + lines + movements + batch qtys as of then). **Awaiting owner
  decision: restore them or re-enter the sales.** Live worker is current (routes 401, not 404).
- **RBAC** (2026-10-31): `src/logic/permissions.ts` (13 modules × actions), `role_permissions`
  table, `app_users.role` `ca` + `access_until`; `routePermission()` 403 on every route;
  sidebar/actions filtered; Settings Members + owner-only Roles grid. Live DB altered by
  one-off SQL (drizzle push still errors "activity_log already exists").
- **Build**: macOS `.app` 7.19 MiB + `Stock Tracker_1.0.0_aarch64.dmg` 3.41 MiB in
  `src-tauri/target/release/bundle/`. `tauri.conf.json` targets `"all"`.
- Checks green: `npx tsc --noEmit` clean (root + web + worker), `npx vitest run` = 248,
  web build ok.

## Release plan (Windows / Android / Linux)
Full plan: **`docs/RELEASE_PLAN.md`**. Summary: **Windows `.exe`** — fix identifier
(`com.stocktracker.app` → `com.sdhhe.stocktracker`), tag `v1.0.0` → `release.yml` builds
NSIS `.exe` + `.msi` (unsigned → SmartScreen unless a cert is bought). **Android** — desktop
UI is 1024 px / keyring desktop-only → use the responsive **web app**: PWA (manifest + SW)
then **TWA APK** via Bubblewrap (1–2 days). **Decisions**: PWA+TWA vs Tauri shell vs offline
bundle; sideload vs Play; Windows signing cert; offline needed on phone?

## Next tasks
1. Owner decision: restore the 30–31 Oct bills from `docs/db-backup-2026-10-31.sql`, or
   re-enter those sales (chart fills either way once rows exist).
2. Owner decision on the 4 release questions above.
3. Windows: identifier fix → tag `v1.0.0` → download `.exe`/`.msi` from the draft release.
4. Android: PWA then TWA APK (if approved).
5. T-4 lot-wise FY report; T-5 sale preview batch breakdown; Delivery-in-total decision;
   `login-bg.webp`; email; rotate owner password; Playwright suites.

## Commands
- Web: `cd web-worker && ./node_modules/.bin/wrangler dev` · `cd web && npm run dev` ·
  Deploy `cd web && npm run build` → `cd ../web-worker && ./node_modules/.bin/wrangler deploy`.
- Desktop: `npm run tauri build` (macOS `.app`/`.dmg` in `src-tauri/target/release/bundle/`).
- Tests: `npx vitest run --reporter=dot` (248) · `npm run test:db` (needs DATABASE_URL_TEST) ·
  `npx tsc --noEmit` clean (root + web + worker).
