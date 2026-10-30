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
- [ ] **T-2.1 Secure storage** — Tauri plugin for OS keychain/stronghold; save/read `DATABASE_URL`, `PIN_HASH`.
- [ ] **T-2.2 Setup screen** — first launch: enter Neon URL, test connection, set PIN. Acceptance: restart → asks PIN, not URL.
- [ ] **T-2.3 PIN lock** — wrong PIN 5× → wait 60 s. Tests TESTING §C.

## Phase 3 — Items & Purchases
- [ ] **T-3.1 Items CRUD** — src/pages/Items.tsx, src/db/items.ts. Validate with zod. Unique name.
- [ ] **T-3.2 Add Purchase** — src/pages/AddPurchase.tsx, src/db/purchases.ts. Transaction: purchase+batch+movement.
  Total auto-calc. Prefill last price. Acceptance: TESTING §B1.
- [ ] **T-3.3 Purchases list** — filter by item/date, show batch remaining.

## Phase 4 — Stock check & FIFO (MOST IMPORTANT)
- [ ] **T-4.1 fifo.ts** — tests FIRST (TESTING §A2), then code. Pure function.
- [ ] **T-4.2 stockCheck.ts + average.ts** — tests §A3, §A4.
- [ ] **T-4.3 Stock Check screen** — preview used qty & cost → confirm → transaction (BLUEPRINT §6). Acceptance §B2.
- [ ] **T-4.4 Wastage/Usage entry** — same allocation, type WASTAGE/USAGE.
- [ ] **T-4.5 Edit/delete purchase** — replay later movements. Acceptance §B3.

## Phase 5 — Expenses & Dashboard
- [ ] **T-5.1 Expenses CRUD** — src/pages/Expenses.tsx.
- [ ] **T-5.2 Dashboard** — month spend, stock value, low-stock list, last 5 purchases.

## Phase 6 — Reports & Backup
- [ ] **T-6.1 stats.ts** — daily usage, days left, price change %, monthly spend, overbuying (tests §A5).
- [ ] **T-6.2 Reports page** — price history chart, usage, spend by category/supplier.
- [ ] **T-6.3 Export** — Excel (xlsx) + PDF; full backup JSON export & import into a fresh Neon branch (§D).

## Phase 7 — Packaging
- [ ] **T-7.1 Icon/name** — tauri.conf.json productName "Stock Tracker", icons via `npx tauri icon`.
- [ ] **T-7.2 Local build** — `npm run tauri build`. Acceptance: installer runs on your OS (§E).
- [ ] **T-7.3 CI builds** — .github/workflows/release.yml using tauri-apps/tauri-action for windows/macos/ubuntu + run `npm test`.

## Phase 8 — AI suggestions
- [ ] **T-8.1 Rule suggestions** — src/logic/rules.ts: low stock, price up >10%, spend up >15%, overbuying. No AI.
- [ ] **T-8.2 Ollama explain** — src/ai/suggest.ts: send stats JSON, get JSON array back, validate with zod, cache in ai_suggestions, fallback to rules.
- [ ] **T-8.3 Chat with tools** — read-only tools only (get_item_usage, get_price_history, get_low_stock_items, get_spending_by_category, get_supplier_comparison).
- [ ] **T-8.4 AI settings** — on/off, cloud/local model, API key in secure storage, refresh max once/day.

## Phase 9 — Real-use
- [ ] **T-9.1** One week real data; compare with bills daily. Log mismatches as bugs in HANDOVER.
