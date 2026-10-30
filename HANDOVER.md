# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-30 18:32 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
Phase 4 (T-4.1 → T-4.5) DONE. Next: T-5.1 Expenses + Dashboard.

## Status
- [x] done  (DB integration tests still SKIPPED — no DATABASE_URL_TEST)

## Done this session
- T-4.1 `src/logic/fifo.ts` allocateFifo(batches, qtyUsed, factor) + `errors.ts`
  (ValidationError, InsufficientStockError, StockLeftTooHighError, ReplayConflictError).
  13 tests incl. worked example 2200 / B left 2000.
- T-4.2 `stockCheck.ts` computeUsage, `average.ts` weightedAverage/averageCost (1150, 2300),
  `replay.ts` replayItem(batches, movements, factor) — replays STOCK_CHECK/USAGE/WASTAGE in
  date order from qty_original, throws ReplayConflictError with the offending date. 20 tests.
- T-4.3 `client.ts` getTxDb(url) + withTransaction(url, fn) (Pool/neon-serverless, pool closed
  in finally); `wss://*.neon.tech` added to csp + devCsp. `db/stock.ts` planStockEntry (PURE,
  shared by preview and save) + saveStockEntry/stockCheck: SELECT…FOR UPDATE → computeUsage →
  allocateFifo → UPDATE batches → INSERT movement → INSERT links, ONE transaction.
  `pages/StockCheck.tsx`: current stock + open batches, live preview, friendly
  "Stock left is more than current stock (N). Did you miss a purchase?".
- T-4.4 mode toggle Stock left | Used | Wastage on the same page; qty_change = −used.
- T-4.5 `updatePurchase` / `deletePurchase` + replayAndWriteBack (loads all batches+movements
  of the item, replayItem, writes back qty_remaining/costs, rebuilds movement_batch_links).
  Purchases page: Edit modal + Delete confirm; ReplayConflictError → rollback + date in message.
- e2e updated: Stock Check is a real page now (no longer "Coming soon"). Verified 13 pass.

## In progress (exact point where work stopped)
- File: —
- What was half-done: nothing.

## Next task
T-5.1  (Expenses + Dashboard per BUILD_PLAN Phase 5)

## Next exact step (one action the next session does first)
- Read BUILD_PLAN Phase 5, then TESTING §A5/B6 before writing code.

## Files touched this session
- src/logic/{fifo,stockCheck,average,replay,errors}.ts + 4 test files
- src/db/{client,stock,purchases,test-utils}.ts, src/db/{stock,*.int}.test.ts
- src/pages/{StockCheck,Purchases}.tsx + tests
- src/lib/db-context.tsx (added useDbUrl), src/App.tsx, src-tauri/tauri.conf.json
- vite.config.ts (exclude e2e), e2e/app.spec.ts, docs/*

## Tests
- `npm test` → 103 passed / 0 failed (18 files)
- `npm run test:e2e` → 13 passed
- `npm run test:db` → 1 passed, 10 SKIPPED (needs DATABASE_URL_TEST)
- `npm run typecheck` → clean

## Blockers / errors (paste only the key error line)
- No DATABASE_URL_TEST → §B1/B2/B3/B4/B5 have NEVER executed against a real DB. This is the
  biggest untested area: SQL, FOR UPDATE, and replay write-back.

## Notes for next session
- Vitest must keep excluding `e2e/**` (Playwright specs otherwise get collected and fail).
- Replay is the risky part: replayAndWriteBack matches the PURCHASE movement by
  (item, type, old date, old qtyChange). If a purchase is edited twice, verify matching.
- `wss://*.neon.tech` is now in CSP — a packaged build needs it too.
- ⚠ App still points at the shared production DB; T-3/T-4 write REAL rows. Dev branch overdue.
- Still open: `ollama` not installed; GitHub push; window title "app-tmp".
