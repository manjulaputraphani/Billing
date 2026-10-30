# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-30 21:52 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
Phase 5 (T-5.1 Expenses, T-5.2 Dashboard) DONE. Next: T-6.1 stats.ts (§A5).

## Status
- [x] done  (DB tests still SKIPPED — no DATABASE_URL_TEST)

## Done this session
- T-5.1 `src/db/expenses.ts`: listExpenses(month, category) via half-open month range,
  create/update/delete, listExpenseCategories, monthRange. zod: category required,
  amountPaise int > 0, date required. `pages/Expenses.tsx`: month picker + category filter,
  table, month-total footer, add/edit modal with a datalist (7 presets + custom), delete confirm.
- T-5.2 `src/db/dashboard.ts` getDashboard(db, month) — ALL sums in SQL: purchases, expenses,
  total spent, used cost (STOCK_CHECK+USAGE), wastage, stock value
  round(sum(qty*price / case unit kg|l then 1000 else 1)), low stock (HAVING stock <= min),
  last 5 purchases / 5 stock entries, price alerts via ROW_NUMBER (>10%).
  `pages/Dashboard.tsx`: month picker, 6 cards, price alerts, low-stock list with
  /purchases/new?item=ID links, empty state "Add your first item", month label.
  Dashboard is now the index route; `pages/Home.tsx` deleted. AddPurchase preselects ?item=.
- e2e `app.spec.ts` updated (Expenses + Stock Check are real pages). New
  `e2e/main-flow.spec.ts` runs the real UI against DATABASE_URL_TEST (truncates first) —
  SKIPPED until that env var exists.

## In progress (exact point where work stopped)
- File: —
- What was half-done: nothing.

## Next task
T-6.1  (stats.ts — daily usage, days left, price change %, monthly spend, overbuying; tests §A5)

## Next exact step (one action the next session does first)
- Read TESTING §A5 (30 days/18000 g → 600 g/day, 3000 stock → 5 days left; 1000→1200 fires
  "price_up", 1000→1050 does not; 10000→11800 fires "spend_up"; no data → [] no crash), write
  src/logic/stats.test.ts first.

## Files touched this session
- src/db/{expenses,dashboard}.ts, src/db/{expenses,dashboard.int}.test.ts
- src/pages/{Expenses,Dashboard}.tsx + tests, src/pages/Home.tsx (deleted)
- src/pages/AddPurchase.tsx (?item= preselect), src/App.tsx, src/App.test.tsx
- e2e/app.spec.ts, e2e/main-flow.spec.ts, docs/*

## Tests
- `npm test` → 119 passed / 0 failed (21 files)
- `npm run test:e2e` → 13 passed + 1 skipped (main-flow needs DATABASE_URL_TEST)
- `npm run test:db` → 1 passed, 13 SKIPPED
- `npm run typecheck` → clean

## Blockers / errors (paste only the key error line)
- Still no DATABASE_URL_TEST → every SQL path (§B1–B6 + dashboard sums + main-flow e2e) has
  NEVER run against a real database. This is now the largest risk in the project.

## Notes for next session
- Dashboard month uses LOCAL date (YYYY-MM) from the browser, not UTC.
- The stock-value SQL uses ::numeric + round() on purpose: plain integer division truncates.
- Vitest must keep excluding `e2e/**`.
- Replay still matches the PURCHASE movement by (item, type, old date, old qty).
- ⚠ App still points at the shared production DB; writes are REAL. Dev branch overdue.
- Still open: `ollama` not installed; GitHub push; window title "app-tmp".
