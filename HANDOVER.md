# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 15:05 by MiniMax M3.1 Flash (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Both editions share the coffee theme, weighted-average costing, FY reports and login sessions.

## Live / deployment
- Worker `sdhhe-api`: static assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy` (wrangler 4.86 works on Node 20 here).
- Secrets: `DATABASE_URL`, `SESSION_SECRET`. Optional email: `RESEND_API_KEY` / `MAIL_FROM` (or the
  AES-GCM encrypted `resend_api_key_enc` in Settings). DB: Neon `SriDurgaHariHaraEnterprises`.
- Members: owner **B PHANI KUMAR** (7569208757), staff **Chaluvaraj** (9019744242).

## Done (2026-10-31)
- **Profit & turnover**: weighted-average costing (value pool per item; purchase expenses inside the
  stock cost; cost snapshot per sale line), India FY (1 Apr–31 Mar, label "2026-27"), FY report
  (turnover excl. GST, purchases, gross, net, closing stock qty/value/avg cost, per-deal profit) on
  the web *Reports* tab and the desktop *Reports* page. WAC/FIFO switch in Settings.
  `src/logic/weightedCost.ts`, `src/logic/finYear.ts`, `src/db/costing.ts`, `src/db/reports.ts`.
- **Expenses** carry a type: purchase (into stock cost) / sale (onto the deal) / general; purchases
  have a "Transport ₹" field, bills a "Delivery ₹" field.
- **Login sessions** (`user_sessions`) + `user.login`/`user.logout` in the activity log (actor = the
  member's name); per-member sessions, active time and last login in web *Team → Usage*. The Activity
  list refetches when the tab opens (it used to load once at sign-in). Session length = 12 h
  (`SESSION_MAX_SECONDS`); the desktop app locks on request, no timeout.
- **Web UI**: compact dashboard empty state + "Add expense" button, chart y-axis/gridlines/hover-tap
  tooltip (no zero bars), grouped sidebar with inline-SVG icons (ADMIN = owner only), two-line business
  name, faint coffee-bean texture, `EmptyState` component, split sign-in page (photo left, form right).
- **Item thumbnails**: `items.image_url` (nullable) + optional image link in the item form; 40×40
  thumbnails in the Items list and the New Bill picker (letter circle when there is no image).
- **Credit (udhaar) tags**: an unpaid bill shows "Credit ₹X" in the invoice list (web + desktop), the
  dashboard has a "Credit given" card (total + unpaid bill count), the customer master has a Credit
  column, and **Record payment** settles it (the worker endpoint reads the already-parsed body).
- **Customer master**: `src/db/customers.ts` — one row per client (matched by phone → GSTIN → name);
  billing saves/updates the master instead of inserting duplicates. Web: *Customers* screen (CONTACTS
  group, search, bill count, billed total) + a customer picker on the billing form. The screen has
  an **Add customer** button (and Edit/Delete per row). Desktop: the customer name field offers the
  saved clients.
- **Navigation**: the desktop rail is sticky (stays while the page scrolls); below 768 px the header
  is icon-only and the grouped nav opens as a left drawer that closes when a link is picked.
- DB migrated additively; cost pools backfilled. Required test case verified: avg ₹102.33/kg,
  gross ₹153.33, net ₹113.33, 280 kg left.

## Next tasks (priority)
1. **Add `web/public/assets/login-bg.webp`** (the sign-in photo; ~1200×1600, <300 KB) — the panel
   currently shows the brown fallback.
2. **Enable email**: Resend key + MAIL_FROM → Send test; desktop Gmail app password → Send test.
3. **Rotate the owner password** (short/exposed) via Team → Reset password.
4. Save the Playwright suites into the repo (`web/tests/`) — they currently live only in TMPDIR.
5. ~~Fix the PRE-EXISTING tsc errors~~ — DONE: all three typechecks are clean now (root, web,
   web-worker) and `npm run build` (desktop) succeeds again.
6. Link purchase/sale expenses to their purchase/deal in the UI (columns exist, forms only set the
   type) · `tablesFilter` guard in drizzle.config; drop the interim `sales` table.
7. Still desktop-only: Suggestions/Ask AI (Ollama), print/Save-as-PDF, Excel export, offline,
   auto-update, keychain setup · V2-P12 pack units/WhatsApp, V2-P14 barcode, V2-P16 multi-location.

## Commands
- Web local: `cd web-worker && ./node_modules/.bin/wrangler dev` (:8787 = web/dist + API) ·
  `cd web && npm run dev` (:5173) · `cd web && npm run typecheck`
- Tests: `npx vitest run --reporter=dot` (238 green) · `npx tsc --noEmit` clean (root + web + worker)
- e2e skipped (no DATABASE_URL_TEST). The Neon **WebSocket** pool cannot open connections in this
  sandbox → billing/stock-write paths can only be exercised on the user's machine or in Workers.
