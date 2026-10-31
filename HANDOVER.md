# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-11-01 00:10 by GLM-5.2 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
RBAC (Owner / CA / Staff) on web + desktop; macOS `.app`/`.dmg` built 2026-11-01.

## Done
- **RBAC**: `src/logic/permissions.ts` (13 modules × view/create/edit/delete/export; defaults
  Owner all, CA finance view+export + items/customers/stock view, Staff entry create + bills/
  items view). `role_permissions` table; `app_users.role` includes `ca` + `access_until`.
  Live DB altered by one-off SQL (drizzle push still errors "activity_log already exists").
- **Web/API**: `routePermission()` 403 guard on every route; `/api/auth/login|me` return
  `permissions`; access-until enforced on login + requests; auto-inactive; `/api/roles`
  owner-only; last-active-owner guard; `permissions.update` logged. Sidebar/actions filtered;
  initial view redirects to first allowed tab.
- **Desktop**: login loads permissions into `setCurrentPermissions`; `can()` drives `Layout`,
  route `Guarded`, and action buttons (Items/Purchases/StockCheck/Billing/Expenses). Settings
  has Members (Role + Access until, role select, last-owner guard) and an owner-only Roles &
  permissions grid. `listAppUsers` lazily disables expired accounts.
- **Build**: macOS `.app` 7.19 MiB + `Stock Tracker_1.0.0_aarch64.dmg` 3.41 MiB in
  `src-tauri/target/release/bundle/`. `tauri.conf.json` targets set to `"all"`.
- `npx tsc --noEmit` clean; `npx vitest run` = 248 green; web + root builds ok.

## Release plan (Windows / Android / Linux)
Full plan: **`docs/RELEASE_PLAN.md`**. Summary:
- **Windows `.exe`**: fix identifier (`com.stocktracker.app` → `com.sdhhe.stocktracker`), push
  tag `v1.0.0` or run `release.yml`; `windows-latest` produces NSIS `.exe` + `.msi` (unsigned
  → SmartScreen warning unless a code-signing cert is bought).
- **Android**: desktop UI is 1024 px / keyring is desktop-only → use the responsive **web app**.
  Recommended: PWA (manifest + SW) then **TWA APK** via Bubblewrap (same-origin cookies/RBAC,
  Play-friendly, 1–2 days). Alternatives: Tauri Android remote wrapper (2–3 days), bundled
  web + CORS/`SameSite=None` (3–5 days, offline), port desktop UI (1–2 weeks, not recommended).
- **CI**: existing `release.yml` already builds Windows/macOS/Linux; add an Android job
  (`setup-java` 17 + `setup-android` + Rust targets + `tauri android build --apk`) if needed.
- **Decisions**: (1) Android PWA+TWA vs Tauri shell vs bundled offline; (2) sideload vs Play
  (`.aab`); (3) Windows signing cert; (4) offline required on phone?

## Next tasks
1. Owner decision on the 4 release questions above.
2. Windows: identifier fix → tag `v1.0.0` → download `.exe`/`.msi` from the draft release.
3. Android: PWA then TWA APK (if approved).
4. T-4 lot-wise FY report; T-5 sale preview batch breakdown; Delivery-in-total decision;
   `login-bg.webp`; email; rotate owner password; Playwright suites.

## Commands
- Web: `cd web-worker && ./node_modules/.bin/wrangler dev` · `cd web && npm run dev` ·
  Deploy `cd web && npm run build` → `cd ../web-worker && ./node_modules/.bin/wrangler deploy`.
- Desktop: `npm run tauri build` (macOS `.app`/`.dmg` in `src-tauri/target/release/bundle/`).
- Tests: `npx vitest run --reporter=dot` (248) · `npm run test:db` (needs DATABASE_URL_TEST) ·
  `npx tsc --noEmit` clean (root + web + worker).