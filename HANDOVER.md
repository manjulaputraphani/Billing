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
- **Chart empty = deleted data, not the query** (verified read-only against the live DB):
  the 4 bills dated 30–31 Oct were deleted as "development data" in commit `aebc6d1`
  (2026-10-31 cleanup). **Restored 2026-11-01**: `SD-2026-000002` (30 Oct, KALKI ENTERPRISES,
  ₹7,875) verbatim from `docs/db-backup-2026-10-31.sql` (bill + line + movement + batch link;
  batch 2: 1000→500; audit `sale.restore`; id sequences fixed; KALKI's customer row was also
  gone and was restored). Chart now shows sales on 30 Oct. **Open**: `SD-2026-000003` /
  `SD-2026-000004` (31 Oct, TEST-labelled customers) + `SD-2026-000001` (cancelled) skipped —
  owner to confirm if any is a real 31 Oct sale (restore the same way) or re-enter it.
- **RBAC** (2026-10-31): `src/logic/permissions.ts` (13 modules × actions), `role_permissions`
  table, `app_users.role` `ca` + `access_until`; `routePermission()` 403 on every route;
  sidebar/actions filtered; Settings Members + owner-only Roles grid. Live DB altered by
  one-off SQL (drizzle push still errors "activity_log already exists").
- **Build**: macOS `.app` 7.19 MiB + `Stock Tracker_1.0.0_aarch64.dmg` 3.41 MiB in
  `src-tauri/target/release/bundle/`. `tauri.conf.json` targets `"all"`.
- Checks green: `npx tsc --noEmit` clean (root + web + worker), `npx vitest run` = 248,
  web build ok.

## Release plan (Windows / Android / Linux)
Full plan: **`docs/RELEASE_PLAN.md`**. **Windows**: fix identifier → tag `v1.0.0` →
`release.yml` builds NSIS `.exe`/`.msi` (unsigned → SmartScreen warning). **Android**: use
the responsive web app → PWA + TWA APK via Bubblewrap. **Open decisions**: PWA+TWA vs Tauri
shell vs offline; sideload vs Play; Windows cert; offline needed on phone?

## Next tasks
1. Owner decision: are `SD-2026-000003` / `SD-2026-000004` (31 Oct) real sales? If yes,
   restore their rows from `docs/db-backup-2026-10-31.sql` the same way as `SD-2026-000002`;
   if no, re-enter the real 31 Oct sale via Billing.
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
## Blockers
- Neon HTTP (fetch) is flaky from this machine: intermittent "TypeError: fetch failed" — retry 3–5× before trusting a failure.
