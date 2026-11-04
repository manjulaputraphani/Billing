# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-11-04 12:05 by GLM 5.3 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
RBAC (Owner / CA / Staff) on web + desktop; macOS `.app`/`.dmg` built 2026-10-31.

## Done
- **Web email LIVE (2026-11-04)**: `RESEND_API_KEY` set as worker secret via machine wrangler OAuth (user's
  Cloudflare API token verifies OK but has NO Workers perms → deploys/secrets still need OAuth). Test mail
  delivered to blvphani@gmail.com (Resend signup address). Until a domain is verified at resend.com/domains,
  `onboarding@resend.dev` delivers ONLY to that address → set notify email = blvphani@gmail.com in web
  Settings → Notifications for the app's Send test; shop-address + customer "Email bill" need the verified
  domain → then `wrangler secret put MAIL_FROM`.
- **Dashboard UI fixes (2026-11-01)**: (1) sidebar pinned — `.nav-texture` no longer sets `position`
  (overrode Tailwind sticky/fixed); desktop rail `sticky top-0 h-screen`, nav scrolls internally, theme/
  user/Sign-out pinned. (2) Recent activity = latest 4 + "View all activity →"; Activity pages 20 with
  "Load more" (`/api/activity?offset=`). (3) 14-day chart window now IST: `today−13 … today` via
  `(now() at time zone 'Asia/Kolkata')::date` (was UTC).
- **Restored SD-2026-000002** (2026-11-01): 30 Oct KALKI bill ₹7,875 from `docs/db-backup-2026-10-31.sql`
  (bill + line + movement + batch link, batch 2: 1000→500, `sale.restore` audit, customer row + sequences).
  **Open**: `SD-2026-000003`/`000004` (31 Oct, TEST customers) + `000001` (cancelled) — owner to confirm real
  31 Oct sale (restore same way or re-enter).
- **RBAC** (2026-10-31): `src/logic/permissions.ts` (13 modules × actions), `role_permissions` table,
  `app_users.role` `ca` + `access_until`; `routePermission()` 403 on every route; sidebar/actions filtered;
  Settings Members + owner-only Roles grid. Live DB altered by one-off SQL (drizzle push still errors
  "activity_log already exists").
- **Build**: macOS `.app` 7.19 MiB + `Stock Tracker_1.0.0_aarch64.dmg` 3.41 MiB in
  `src-tauri/target/release/bundle/`; `tauri.conf.json` targets `"all"`.
- Checks green: `npx tsc --noEmit` clean (root + web + worker), `npx vitest run` = 248, web build ok.

## Release plan (Windows / Android / Linux)
Full plan: **`docs/RELEASE_PLAN.md`**. **Windows**: fix identifier → tag `v1.0.0` → `release.yml` builds NSIS
`.exe`/`.msi` (unsigned → SmartScreen warning). **Android**: responsive web → PWA + TWA APK via Bubblewrap.
**Open decisions**: PWA+TWA vs Tauri shell vs offline; sideload vs Play; Windows cert; offline on phone?

## Next tasks
1. Owner decision: are `SD-2026-000003` / `SD-2026-000004` (31 Oct) real sales? Restore from
   `docs/db-backup-2026-10-31.sql` like SD-2026-000002, or re-enter via Billing.
2. Owner decision on the 4 release questions above.
3. Email finish: verify a domain in Resend → `wrangler secret put MAIL_FROM` → owner clicks Send test in
   web Settings (notify email must be reachable — blvphani@gmail.com until the domain is verified).
4. Windows: identifier fix → tag `v1.0.0` → download `.exe`/`.msi` from the draft release.
5. Android: PWA then TWA APK (if approved).
6. T-4 lot-wise FY report; T-5 sale preview batch breakdown; Delivery-in-total decision; `login-bg.webp`;
   rotate owner password; Playwright suites.

## Commands
- Web: `cd web-worker && ./node_modules/.bin/wrangler dev` · `cd web && npm run dev` ·
  Deploy: `cd web && npm run build` → `cd ../web-worker && ./node_modules/.bin/wrangler deploy`.
- Desktop: `npm run tauri build` (macOS `.app`/`.dmg` in `src-tauri/target/release/bundle/`).
- Tests: `npx vitest run --reporter=dot` (248) · `npm run test:db` (needs DATABASE_URL_TEST) ·
  `npx tsc --noEmit` (root + web + worker).

## Blockers
- Neon HTTP (fetch) is flaky from this machine: intermittent "TypeError: fetch failed" — retry 3–5×
  before trusting a failure.