# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-30 18:20 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
Phase 3 (T-3.0 → T-3.3) DONE. Next: T-4.1 FIFO allocation.

## Status
- [x] done  (DB integration tests written but SKIPPED — no DATABASE_URL_TEST)

## Done this session
- T-3.0: src/components/Layout.tsx sidebar + react-router-dom (HashRouter in App.tsx),
  ComingSoon page, Settings page (Reset connection moved off Home).
- T-3.1: src/db/items.ts listItems/getItem/createItem/updateItem/deleteItem/getStockLeft;
  zod (name required, unit kg|l|pcs, minStockBase int>=0), unique name case-insensitive;
  "Item has purchases" guard. src/pages/Items.tsx table + add/edit modal + delete confirm.
  units.ts gained formatQuantity ("1.50 kg").
- T-3.2: src/db/purchases.ts addPurchase = ONE statement with data-modifying CTEs
  (purchase → batch → PURCHASE movement; supplier find-or-create in the same statement).
  Also getLastPurchase, listSuppliers, listPurchases, parsePurchaseInput.
  src/logic/purchase.ts computeTotalPaise / rupeesToPaise / formatPriceChange (+tests).
  src/pages/AddPurchase.tsx: live total, last-price prefill + "Last price: ₹X (date)",
  "+20% vs last time" after save.
- T-3.3: src/pages/Purchases.tsx table + item/date filters, newest first, batch left.
- Tooling: `@types/node` + tsconfig `types:["node"]`; vitest.db.config.ts;
  scripts `test` (excludes *.int.test.ts) and `test:db` (DB suite only).
- E2E: `playwright.config.ts` + `e2e/app.spec.ts` (5 tests). Stubs `window.__TAURI_INTERNALS__`
  in addInitScript, keeps "keychain" in localStorage so reload = restart. Covers first launch,
  PIN mismatch, setup→lock→dashboard, reload asks PIN, 5-wrong lockout, sidebar nav.
  UI only — does NOT cover the real keychain, argon2 or Neon.

## In progress (exact point where work stopped)
- File: —
- What was half-done: nothing.

## Next task
T-4.1  (FIFO: src/logic/fifo.ts + the BLUEPRINT §5 worked example as a test)

## Next exact step (one action the next session does first)
- Read BUILD_PLAN T-4.1, write src/logic/fifo.test.ts from TESTING §A2 first, then fifo.ts.

## Files touched this session
- src/components/Layout.tsx, src/pages/{Home,Settings,ComingSoon,Items,AddPurchase,Purchases}.tsx
- src/pages/{Items,AddPurchase,Purchases}.test.tsx
- src/db/{items,purchases,test-utils}.ts + items.test.ts, *.int.test.ts
- src/logic/{units.ts,units.test.ts,purchase.ts,purchase.test.ts}
- src/App.tsx, src/App.test.tsx, vite.config.ts, vitest.db.config.ts, tsconfig.json,
  package.json, .env.example, docs/*

## Tests
- Last run: `npm test` → 58 passed / 0 failed (12 files)
- `npm run test:e2e` → 13 passed (Playwright, Chromium, Tauri IPC stubbed)
- `npm run test:db` → 1 passed, 5 SKIPPED (needs DATABASE_URL_TEST)
- `npm run typecheck` → clean

## Blockers / errors (paste only the key error line)
- No DATABASE_URL_TEST configured → B1/B5 never actually executed. Add a line to `.env`
  pointing at a SEPARATE dev branch, then `npm run test:db`.

## Notes for next session
- `test:db` uses vitest.db.config.ts; CLI --exclude only APPENDS to config exclude, so the
  plain command silently skipped the int tests — do not "simplify" it back.
- test-utils.ts refuses to run if DATABASE_URL_TEST === DATABASE_URL, or if the target has
  Users/Invoices/StockLedger/__EFMigrationsHistory. Keep that guard.
- ⚠ Still pointing at the shared production DB `SriDurgaHariHaraEnterprices`. T-3 writes REAL
  rows now. A dev branch is overdue. Password still needs resetting in Neon.
- App flow: Setup → Lock → Layout(Home/Items/Purchases/AddPurchase/…). HashRouter (Tauri-safe).
- Still open: `ollama` not installed; GitHub push; window title "app-tmp".
