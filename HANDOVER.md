# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 15:20 by MiniMax M3.1 Flash (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Both editions share the coffee theme, weighted-average costing, FY reports, login sessions and the
customer master.

## Live / deployment
- Worker `sdhhe-api`: static assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy` (wrangler 4.86 works on Node 20 here).
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. Optional email: `RESEND_API_KEY` / `MAIL_FROM` (or the
  AES-GCM encrypted `resend_api_key_enc` in Settings). DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## Done (2026-10-31)
- **Profit & turnover**: weighted-average costing (value pool per item, purchase expenses inside the
  stock cost, cost snapshot per sale line), India FY (1 Apr–31 Mar, "2026-27"), FY report (turnover
  excl. GST, purchases, gross, net, closing stock qty/value/avg cost, per-deal profit) on the web
  *Reports* tab and the desktop *Reports* page. WAC/FIFO switch in Settings.
- **Expenses** carry a type: purchase (into stock cost) / sale (onto the deal) / general; purchases
  have a "Transport ₹" field, bills a "Delivery ₹" field.
- **Login sessions** (`user_sessions`) + `user.login`/`user.logout` in the activity log (actor = the
  member's name); per-member sessions/active time/last login in web *Team → Usage*. The Activity list
  refetches when the tab opens. Session length = 12 h (`SESSION_MAX_SECONDS`); the desktop locks on
  request, no timeout.
- **Web UI**: compact dashboard empty state + "Add expense" button, ₹ y-axis + gridlines + hover-tap
  tooltip (no zero bars), grouped sidebar with inline-SVG icons (ADMIN = owner only), two-line business
  name, coffee-bean texture, `EmptyState` component, split sign-in page (photo left), item thumbnails
  (40×40, `items.image_url`), credit tags + **Record payment**, customer master with **Add customer**
  and a picker on the billing form. The rail is sticky; below 768 px the header is icon-only and the
  nav opens as a left drawer.
- Required test case verified: avg ₹102.33/kg, gross ₹153.33, net ₹113.33, 280 kg left.

## Database (cleaned 2026-10-31)
- Dropped the old app's 31 unused CamelCase tables; `drizzle.config.ts` has a `tablesFilter` so
  drizzle never recreates them. The schema is now 19 tables (all ours + `investments`).
- Removed the development data (test bills + lines/movements, test customers/suppliers, the AI
  suggestion, the dev audit trail and sessions) and rebuilt the batch quantities + the cost pool from
  the purchases, so the stock matches the books again.
- Kept: 8 items, 7 purchases, their batches/movements, KALKI ENTERPRISES, 2 investments, 22 shop
  settings and the 2 users. The interim `sales` table was KEPT (the desktop *Sales* screen reads it).
- A full backup (incl. the dropped tables) is at `docs/db-backup-2026-10-31.sql` (git-ignored) — take
  one before any future destructive change.

## Next tasks (priority)
1. **Add `web/public/assets/login-bg.webp`** (sign-in photo, ~1200×1600, <300 KB) — the panel now
   shows the brown fallback.
2. **Enable email**: Resend key + MAIL_FROM → Send test; desktop Gmail app password → Send test.
3. **Rotate the owner password** (short/exposed) via Team → Reset password.
4. Save the Playwright suites into the repo (`web/tests/`) — they currently live only in TMPDIR.
5. Link purchase/sale expenses to their purchase/deal in the UI (columns exist, forms only set the type).
6. Still desktop-only: Suggestions/Ask AI (Ollama), print/Save-as-PDF, Excel export, offline,
   auto-update, keychain setup · V2-P12 pack units/WhatsApp, V2-P14 barcode, V2-P16 multi-location.

## Commands
- Web local: `cd web-worker && ./node_modules/.bin/wrangler dev` (:8787 = web/dist + API) ·
  `cd web && npm run dev` (:5173) · `cd web && npm run typecheck`
- Tests: `npx vitest run --reporter=dot` (242 green) · `npx tsc --noEmit` clean (root + web + worker)
