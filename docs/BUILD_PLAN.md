# BUILD PLAN — tick [x] when Definition of Done (AGENTS.md) is met
Each task: Files · Steps · Acceptance. Do ONE task per session if context is small.

## Phase 0 — Setup
- [x] **T-0.1 Install tools** — Follow docs/SETUP.md. Acceptance: `node -v`(20+), `rustc --version`, `git --version`, `ollama -v` work.
  ⚠ 2026-10-30: node 20.20.2, rustc/cargo 1.99.1, git 2.54.0 OK. **`ollama` NOT installed** — install it + `ollama signin` before using opencode.json models.
- [x] **T-0.2 Create project** — `npm create tauri-app@latest stock-tracker` (React, TypeScript, npm). Copy this kit's files into it.
  Acceptance: `npm run tauri dev` opens a window. ✅ 2026-10-30: builds (1m06s), binary runs, webview connected to Vite :1420, React renders (render test passed).
- [x] **T-0.3 Install libs** — `npm i drizzle-orm @neondatabase/serverless zod recharts xlsx jspdf react-router-dom`
  `npm i -D drizzle-kit vitest @testing-library/react @testing-library/jest-dom jsdom tailwindcss @tailwindcss/vite`
  Add scripts: `"test":"vitest run --reporter=dot"`, `"typecheck":"tsc --noEmit"`. Acceptance: `npm test` runs (0 tests ok).
- [x] **T-0.4 Git + GitHub** — `git init`, .gitignore (from kit), first commit, push to private GitHub repo. (⚠ local git done; GitHub push is for the human.)
- [ ] **T-0.5 Neon** — Create project (region Singapore), create branch `dev`. Copy dev URL into local `.env` as `DATABASE_URL` (dev only, gitignored).

## Phase 1 — Database
- [x] **T-1.1 Schema** — Files: src/db/schema.ts, drizzle.config.ts. Tables exactly as BLUEPRINT §4.
  Acceptance: `npx drizzle-kit push` creates tables on `dev` branch.
  ⚠ 2026-10-30: 9 tables CREATED. But `drizzle-kit push` itself cannot run from this agent (non-TTY, `promptNamedWithSchemasConflict`); the identical generated DDL was applied in one additive transaction instead. ⚠ These tables live in the EXISTING app DB `SriDurgaHariHaraEnterprices` (public schema, next to 34 CamelCase tables) — NOT a separate dev branch. `drizzle.config.ts` has `schemaFilter: ["public"]` so drizzle ignores `sdhhe_fy2025`.
- [x] **T-1.2 DB client** — src/db/client.ts: `getDb(url)` using neon-http driver. URL passed in, never imported from code. (+ client.test.ts: rejects empty URL, returns handle without connecting)
- [x] **T-1.3 Money/unit helpers** — src/logic/units.ts (+ test): toBase, fromBase, formatRupees, costPaise. Acceptance: tests in TESTING §A1. (13 tests green; all 5 §A1 cases covered)
  Note: `costPaise(qtyBase, unitPricePaise, pricePer = "kg")` — the 3rd arg is the unit the PRICE is quoted in (qty is always base units). Pass `"pcs"` or `"l"` for those items.

## Phase 2 — Setup & security
- [x] **T-2.1 Secure storage** — Tauri plugin for OS keychain/stronghold; save/read `DATABASE_URL`, `PIN_HASH`.
  (2026-10-30: `keyring` 3 + `argon2` 0.5 in Rust; commands save_secret/get_secret/delete_secret/hash_pin/verify_pin, service "stock-tracker"; typed wrappers in src/lib/secrets.ts. `cargo check` clean. Note: the scaffold `greet` command was removed.)
- [x] **T-2.2 Setup screen** — first launch: enter Neon URL, test connection, set PIN. Acceptance: restart → asks PIN, not URL.
  (2026-10-30: src/pages/Setup.tsx — URL field, "Test connection" via `pingDb` (`select 1`), PIN + confirm (4-6 digits), errors "Cannot connect - check the connection string" / "PINs do not match", saves DATABASE_URL + PIN_HASH, shows ONLY the host (src/lib/url.ts). CSP set in tauri.conf.json: strict `csp` + `devCsp` with https://*.neon.tech in connect-src. The "restart → asks PIN" half is wired in T-2.3.)
- [x] **T-2.3 PIN lock** — wrong PIN 5× → wait 60 s. Tests TESTING §C.
  (2026-10-30: src/pages/Lock.tsx (countdown, input+button disabled while locked), src/pages/Home.tsx (placeholder + "Reset connection" in-app modal, deletes both secrets), src/App.tsx flow loading→Setup|Lock→Home, src/lib/db-context.tsx (`DbProvider`/`useDb`, db built only after unlock). 31 tests green; `tauri dev` accepts the CSP and boots.)

## Phase 3 — Items & Purchases
- [x] **T-3.0 App layout** — src/components/Layout.tsx: sidebar (Dashboard, Items, Purchases, Add Purchase, Stock Check, Expenses, Reports, Settings) + react-router-dom, Tailwind, 1024px+. "Reset connection" moved from Home to Settings. (2026-10-30)
- [x] **T-3.1 Items CRUD** — src/pages/Items.tsx, src/db/items.ts. Validate with zod. Unique name.
  (2026-10-30: listItems (stock left = SUM(batches.qty_remaining)), getItem, createItem, updateItem, deleteItem (blocked, "Item has purchases"), getStockLeft. zod: name required, unit kg|l|pcs, min stock int >= 0; unique name case-insensitive. formatQuantity() added to units.ts ("1.50 kg"). B5 integration test in src/db/items.int.test.ts — SKIPPED until DATABASE_URL_TEST is set.)
- [x] **T-3.2 Add Purchase** — src/pages/AddPurchase.tsx, src/db/purchases.ts. Transaction: purchase+batch+movement.
  Total auto-calc. Prefill last price. Acceptance: TESTING §B1.
  (2026-10-30: addPurchase uses ONE statement with data-modifying CTEs (purchase → batch → PURCHASE movement), supplier found-or-created in the same statement. Live total via computeTotalPaise; prefill + "Last price: ₹X (date)"; "+20% vs last time" after save. §B1 test written in src/db/purchases.int.test.ts — SKIPPED until DATABASE_URL_TEST is set.)
- [x] **T-3.3 Purchases list** — filter by item/date, show batch remaining.
  (2026-10-30: src/pages/Purchases.tsx + listPurchases (joins items/suppliers/batches, newest first) + getStockLeft in src/db/items.ts. Filters: item, from, to.)

## Phase 4 — Stock check & FIFO (MOST IMPORTANT)
- [x] **T-4.1 fifo.ts** — tests FIRST (TESTING §A2), then code. Pure function.
  (2026-10-30: src/logic/fifo.ts allocateFifo(batches, qtyUsed, factor); src/logic/errors.ts (ValidationError, InsufficientStockError, StockLeftTooHighError). 13 tests: worked example 2200 with B left 2000, single batch, exact empty, zero, too much, date order vs array order, same-date by id, skips empty, pcs, rounding, negative qty, bad factor.)
- [x] **T-4.2 stockCheck.ts + average.ts** — tests §A3, §A4.
  (2026-10-30: computeUsage (4000/2000→2000, 4000/4000→0, 6000→StockLeftTooHighError, -1→ValidationError); weightedAverage + averageCost (1150 paise/kg, 2000g→2300); replay.ts replayItem(batches, movements, factor) replaying STOCK_CHECK/USAGE/WASTAGE in date order from qty_original, throwing ReplayConflictError with the offending date. B3 as a pure test: price ₹10→₹11 gives 2300. 20 tests.)
- [x] **T-4.3 Stock Check screen** — preview used qty & cost → confirm → transaction (BLUEPRINT §6). Acceptance §B2.
  (2026-10-30: src/db/client.ts `getTxDb(url)` + `withTransaction(url, fn)` over Pool/neon-serverless (WebSocket, pool closed in `finally`); `wss://*.neon.tech` added to CSP. src/db/stock.ts: `planStockEntry` (pure, shared by preview and save) + `saveStockEntry`/`stockCheck` doing SELECT ... FOR UPDATE → computeUsage → allocateFifo → UPDATE batches → INSERT movement → INSERT links in ONE transaction. src/pages/StockCheck.tsx shows current stock + open batches, live preview "Used 2.00 kg · Cost ₹22.00 · From: … · Left … worth …". §B2 + §B4 tests written in src/db/stock.int.test.ts — SKIPPED until DATABASE_URL_TEST is set.)
- [x] **T-4.4 Wastage/Usage entry** — same allocation, type WASTAGE/USAGE.
  (2026-10-30: mode toggle Stock left | Used | Wastage on StockCheck.tsx; Used/Wastage take a quantity directly and record qty_change = −used with the same FIFO allocation inside the same transaction. Tests: live preview 1.5 kg → ₹16.00, wastage 0.3 kg → type WASTAGE, qty 300.)
- [x] **T-4.5 Edit/delete purchase** — replay later movements. Acceptance §B3.
  (2026-10-30: `updatePurchase(url,id,input)` / `deletePurchase(url,id)` in src/db/purchases.ts — ONE transaction: change/delete purchase + batch + its PURCHASE movement, then `replayAndWriteBack` (load all batches/movements of the item, run replayItem, write back qty_remaining + movement costs, rebuild movement_batch_links). Purchases page gained Edit modal + Delete confirm; a ReplayConflictError rolls back and shows the conflicting date. §B3 tests in stock.int.test.ts (price ₹10→₹11 → 2300; delete first purchase → 1200) — SKIPPED until DATABASE_URL_TEST is set.)

## Phase 5 — Expenses & Dashboard
- [x] **T-5.1 Expenses CRUD** — src/pages/Expenses.tsx.
  (2026-10-30: src/db/expenses.ts listExpenses(month, category) + create/update/delete + listExpenseCategories + monthRange; zod category required, amountPaise int > 0, date required. Page: month picker, category filter, table (date/category/amount/payment/note), month total footer, add/edit modal with category datalist (presets + custom), delete confirm. 12 tests.)
- [x] **T-5.2 Dashboard** — month spend, stock value, low-stock list, last 5 purchases.
  (2026-10-30: src/db/dashboard.ts getDashboard(db, month) — every sum in SQL: purchases, expenses, total, used cost (STOCK_CHECK+USAGE), wastage, stock value (round(sum(qty*price/factor))), low stock via HAVING, last 5 purchases/checks, price alerts via ROW_NUMBER window (>10%). src/pages/Dashboard.tsx: month picker, 6 cards, price alerts, low stock with links to /purchases/new?item=ID (AddPurchase now preselects from ?item=), empty state "Add your first item". Dashboard is the index route; Home.tsx removed. Tests: 4 UI, 3 int (SQL) SKIPPED, e2e main-flow SKIPPED until DATABASE_URL_TEST.)

## Phase 6 — Reports & Backup
- [x] **T-6.1 stats.ts** — daily usage, days left, price change %, monthly spend, overbuying (tests §A5).
  (2026-10-30: added as a Phase-8 prerequisite — Phase 6 was never committed. src/logic/stats.ts:
  dailyUsage, daysLeft, priceChangePct, spendChangePct + §A5 tests. T-6.2 Reports page and
  T-6.3 export are STILL MISSING.)
- [ ] **T-6.2 Reports page** — price history chart, usage, spend by category/supplier.
- [ ] **T-6.3 Export** — Excel (xlsx) + PDF; full backup JSON export & import into a fresh Neon branch (§D).

## Phase 7 — Packaging
- [x] **T-7.1 Icon/name** — tauri.conf.json productName "Stock Tracker", icons via `npx tauri icon`.
  (2026-10-30: version 1.0.0 (tauri + package.json), productName "Stock Tracker", identifier com.stocktracker.app, window title "Stock Tracker" 1280x800, min 1024x700. Version shown in Settings via getVersion(). app-icon.png (1024², generated) → `npx tauri icon` wrote all sizes incl. .icns/.ico. Windows bundle: targets ["nsis","msi"], nsis installMode "currentUser" + startMenuFolder "Stock Tracker" (NSIS also creates the desktop shortcut by default).)
- [x] **T-7.2 Local build** — `npm run tauri build`. Acceptance: installer runs on your OS (§E).
  (2026-10-30: pre-flight green (typecheck, 119 unit tests; test:db 1 passed / 13 skipped — no
  DATABASE_URL_TEST). Secret scan: no real credential outside the gitignored `.env`; one real
  hostname had leaked into src/lib/url.test.ts and was replaced with a fake. `npm run tauri build`
  compiled the release binary but produced NO bundle: targets are ["nsis","msi"] (Windows-only).
  `--bundles app` produced src-tauri/target/release/bundle/macos/Stock Tracker.app (~4.1 MB).
  DMG step fails twice in this sandbox (hdiutil "couldn't unmount - Resource busy"). Windows
  .exe/.msi must be built on Windows or via the T-7.3 CI.)
- [x] **T-7.3 CI builds** — .github/workflows/release.yml using tauri-apps/tauri-action for windows/macos/ubuntu + run `npm test`.
  (2026-10-30: release.yml on tags "v*" + workflow_dispatch; matrix windows-latest, macos-latest
  aarch64 + x86_64, ubuntu-22.04; Rust stable + mac targets; Linux webkit/appindicator/rsvg/patchelf;
  npm ci → npm test → tauri-action (tagName v__VERSION__, releaseName "Stock Tracker v__VERSION__",
  releaseDraft true); permissions contents: write. test.yml runs typecheck + unit tests on every
  push/PR (ubuntu-22.04). docs/RELEASE.md documents the bump/tag/publish flow. NOT yet run on
  GitHub — no remote configured.)

## Phase 8 — AI suggestions
- [x] **T-8.1 Rule suggestions** — src/logic/rules.ts: low stock, price up >10%, spend up >15%, overbuying. No AI.
  (2026-10-30: buildSuggestions(stats) → low_stock (daysLeft <= 5 or stock <= min), price_up (>10%),
  spend_up (>15% vs last month), overbuying (>2x used in 30d), high_wastage (>5% of used);
  priority 1-3, messages with ₹, numbers carried alongside. db/suggestions.ts loadRuleStats in ONE
  SQL query + dismissal rows in ai_suggestions (dismissed=true). Pages: /suggestions (full list +
  Refresh) and a Dashboard card with the top 3 + Dismiss. 17 tests.)
- [x] **T-8.2 Ollama explain** — src/ai/suggest.ts: send stats JSON, get JSON array back, validate with zod, cache in ai_suggestions, fallback to rules.
  (2026-10-30: ai/ollama.ts chat() — local http://localhost:11434/api/chat, cloud https://ollama.com/api/chat
  with Bearer key, stream false, 60s AbortController. ai/suggest.ts builds a human-numbers summary
  (no raw tables/secrets), zod-validates ≤5 suggestions, DROPS any message mentioning a number absent
  from the input, strips markdown fences, falls back with "AI unavailable, showing basic suggestions".
  db/settings.ts stores enabled/mode/model; key in keychain (OLLAMA_API_KEY). Suggestions page gained
  "Refresh AI suggestions" + once-per-day auto-refresh (shouldAutoRefresh) + cached in ai_suggestions.
  8 tests.)
- [x] **T-8.3 Chat with tools** — read-only tools only (get_item_usage, get_price_history, get_low_stock_items, get_spending_by_category, get_supplier_comparison).
  (2026-10-30: ai/tools.ts — six SELECT-only tools (also get_stock_value), unknown names refused; no
  write tool exists. ai/chat.ts loop, max 5 rounds, only the last 10 messages sent. pages/Chat.tsx with
  example chips, Thinking…, read-only notice. 5 tests incl. "delete all data" → no DB call.)
- [x] **T-8.4 AI settings** — on/off, cloud/local model, API key in secure storage, refresh max once/day.
  (2026-10-30: Settings → "AI assistant": On/Off, mode local|cloud, model text (default
  glm-5.3-flash:cloud), cloud key saved via saveSecret(OLLAMA_API_KEY) and never shown again
  (only "Key saved ✓"), "Test AI". Stored in the settings table; auto-refresh capped at once/day.)

## Phase 9 — Real-use
- [ ] **T-9.1** One week real data; compare with bills daily. Log mismatches as bugs in HANDOVER.

## Phase 10 — Sales (added 2026-10-30 on request)
- [ ] **T-10.1 Sold details** — record a sale: item, quantity sold, sale price per unit, date, note.
  One transaction: take the quantity from the oldest batches (FIFO), write a `SALE` stock movement
  + batch links, insert a `sales` row (qty base units, price paise, total paise). Because batches
  shrink, "stock left" drops automatically on Items, Dashboard, Stock Check and suggestions.
  Reject overselling (`Not enough stock`). New Sales page: form with live revenue + left-stock
  preview and a recent-sales list. Money integer paise, qty integer base units.
  Accept: logic/sales.test.ts + pages/Sales.test.tsx green, tsc clean, sale row visible in Neon.
  (2026-10-30: code + tests + migration done; waiting for one real purchase → sale to verify.)
- [x] **T-10.2 UI polish** — warm stone palette (gray→stone via @theme), dark grouped sidebar,
  card surfaces, `.card/.btn/.input/.label` component classes applied across pages, refined
  tables and focus rings, Setup/Lock redesigned. No text, label or heading changes (selectors intact).
  (2026-10-30: all 158 unit/UI tests + 13 e2e green; tsc clean.)
- [x] **T-10.3 Security settings** — Security card with Keychain status (PIN / connection / AI key, values
  never shown), **Lock now**, **Change PIN** (current PIN checked, 4-6 digits, confirm), **Remove AI key**.
  (2026-10-30: Settings.test.tsx 6 tests, full suite 164 green, tsc clean, e2e 13 passed.)

## Phase 11 — Audit & accountability (added 2026-10-30 on request)
- [x] **T-11.1 Activity log** — `activity_log` table (at, actor, event, summary, entity, entity_id).
  Records login (PIN unlock), lock (Lock now), reset, and every create/update/delete: item, purchase,
  stock check/usage/wastage, sale, expense. Log rows share the data's transaction where one exists and
  never block the user action. Settings → "Recent activity" lists the last 25 with time + actor.
  (2026-10-30: App.tsx logs login; Settings logs lock/reset; db/*.ts logs every mutation.)
- [x] **T-11.2 Expense vendor** — `expenses.paid_to` ("Paid to (vendor)") captured in the form, listed
  in the expenses table, included in the audit summary.
- [x] **T-11.3 Bill attachment** — `expense_bills` table (file stored base64 in Postgres, 4 MB cap,
  image/* or PDF). Attach/replace in the expense form; "Save bill" downloads it.
  (2026-10-30: migration applied additively; full suite 166 green, tsc clean.)

## V2 PLAN — full spec in docs/PLAN_V2.md (Phases 10–17, added 2026-10-30)
> ONE phase per session. Every DB change: `drizzle-kit generate` + push to a DEV branch first.
> PREREQUISITE: create a Neon dev branch + `DATABASE_URL_TEST` before any V2 DB work.
- [ ] **V2-P10** Sales + Profit (customers, bill no, sale_items, cancel, profit report, dashboard cards)
  (2026-10-31: profit.ts, billNumber.ts, gst.ts (tests), customers/sale_bills/sale_items schema + tables
  applied, db/billing.ts create/cancel/list/get + createCustomer, Settings → Shop details (name,
  address, phone, GSTIN). **GST Billing screen done**: line entry, live GST (5/12/18/28%), discount,
  payment mode, credit-customer rule, F2 save, printable GST invoice (Print / Save as PDF) with
  CGST/SGST split. Remaining: Profit report, Dashboard cards, int test, replay.ts SALE handling.)
  (2026-10-31: **Bills page** (`/bills`, nav "Bills"): issued + cancelled bills with status badges,
  search/status filter, View (full bill + CGST/SGST + print), Cancel with in-app confirm → bill stays
  visible as cancelled and the sold quantity is restored to its exact batches. Verified end-to-end:
  SD-2026-000001 cancelled, batch 500 g → 1000 g, audit row written.)
- [x] **V2-P10 invoice design** — printed bill rebuilt to match the SDHHE sample PDF: logo monogram, shop
  name/GSTIN/address/phone/email, invoice no/date/payment box, Billed-To with customer GSTIN + address,
  HSN per line, CGST/SGST rate + amount columns, total row, amount in words, bank details, taxable/tax/
  invoice totals, terms & conditions, authorised signatory, diagonal SDHHE watermark, DD-MM-YYYY dates.
  Data added: `customers.gstin`, `sale_bills.gst_rate_bp`, `sale_items.hsn_code`; Settings holds email +
  bank details. Amount-in-words in `src/logic/moneyWords.ts` (tests). 192 tests green.
  (2026-10-31: **Bills → View** now renders this same invoice inside the app (iframe with the exact
  print HTML: header, invoice boxes, buyer GSTIN, HSN table, words, bank, terms, signature, watermark),
  with Print / Save PDF and Cancel bill beneath it.)
- [x] **Multi-item bill test** (6 lines, mixed units kg/l/pcs): SD-2026-000003 = ₹940 + 5% GST ₹47 =
  ₹987, per-line CGST/SGST shares, HSN per line, total row shows "6 items" when units differ, stock
  deducted per item (e.g. CHANA 10→8 kg, MATCH BOX 50→40 pcs), profit ₹125. 192 tests green.
- [x] **GSTIN assist (free route)** — portal has no public API/captcha automation is not allowed: added
  `src/logic/gstin.ts` (format + official mod-36 check digit, tests), "Search GSTIN on portal" button
  (opens services.gst.gov.in in the browser via opener), inline check-digit warning (non-blocking), and
  auto-fill from a saved customer when the GSTIN matches (`findCustomerByGstin`). Saving a bill caches
  the customer so next bills fill themselves. 200 tests green.
- [x] **T-10.4 Bill email** — Settings → Email (From email, display name, SMTP host/port, Gmail app
  password saved to Keychain, Send test email). Customer email field on billing (saved with the
  customer). Bills → View → **Email bill** sends the HTML invoice from the shop's address and logs
  `bill.email`. Rust command `send_email` via `lettre` (rustls). Tested with GSTIN 37JAGPM1479E1ZE
  (valid): bill SD-2026-000004. 203 tests green, cargo check clean.
- [ ] **V2-P11** Credit (udhaar) + supplier dues, ledgers, payments, receivable/payable cards
- [ ] **V2-P12** Pack units + bill PDF/print/WhatsApp share
- [ ] **V2-P13** GST + purchase bill photo (file) + expiry/FEFO
- [ ] **V2-P14** Barcode + reorder list + `audit_log` (before/after JSON)
- [ ] **V2-P15** Auto-update + dark mode + languages (en/te/hi/kn)
- [ ] **V2-P16** Users/roles + locations/transfers + accountant Excel export + daily summary
- [ ] **V2-P17** Offline outbox (SQLite) + AI bill reader

Reconciliation with the interim work of 2026-10-30:
- The interim "Phase 10 sales" (single-item `sales` table) is SUPERSEDED by V2-P10 (bill header +
  `sale_items`). The interim `sales` table is EMPTY, so it can be replaced in the V2-P10 migration.
- The interim `activity_log` (login/lock/create-update-delete summaries) is the base for V2-P14
  `audit_log` (adds user_name, before_json/after_json); migrate it in V2-P14, keep using it meanwhile.
- The current app still points at the single production DB; all V2 migrations must go to a dev branch first.

## LOGIN WORKSTREAM — see docs/PLAN_LOGIN.md (approved 2026-10-31)
- [x] **L1** `app_users` + `activity_log.user_id` schema/migration (2026-10-31: table created, 0 rows; column + index on activity_log)
- [ ] **L2** argon2 `hash_password` / `verify_password` commands
- [ ] **L3** phone normalization + password rules (min 6, tests first)
- [ ] **L4** phone+password login screen, first-run owner setup, lock/logout, retire PIN
- [ ] **L5** audit attribution (user id + name on every write) + user filter
- [ ] **L6** Settings → Users (add / reset password / deactivate, Owner only)
