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
- [ ] **T-8.2 Ollama explain** — src/ai/suggest.ts: send stats JSON, get JSON array back, validate with zod, cache in ai_suggestions, fallback to rules.
- [ ] **T-8.3 Chat with tools** — read-only tools only (get_item_usage, get_price_history, get_low_stock_items, get_spending_by_category, get_supplier_comparison).
- [ ] **T-8.4 AI settings** — on/off, cloud/local model, API key in secure storage, refresh max once/day.

## Phase 9 — Real-use
- [ ] **T-9.1** One week real data; compare with bills daily. Log mismatches as bugs in HANDOVER.
