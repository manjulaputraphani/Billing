# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 00:05 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
**V2-P10 Sales + Profit — in progress.** Done: profit + bill-number logic (tests), schema, DB layer
(create/cancel/list). Remaining: push to DEV, integration test, 3 screens + dashboard cards.
Then: charts (approved plan in docs/PLAN_ANALYTICS.md) → V2-P11 → Funds tab.

## Status
- [x] Interim v1  ·  [~] V2-P10 (logic+schema+DB done; screens/DB-verify pending)  ·  [ ] later phases

## Done this session (2026-10-31)
- Approved analytics plan saved: docs/PLAN_ANALYTICS.md (Recharts, Dashboard tabs, actual-cash funds,
  order P10 → charts → P11 → funds).
- V2-P10 logic, tests first: `src/logic/profit.ts` (lineProfit/billProfit/marginPct) and
  `src/logic/billNumber.ts` (SD-YYYY-NNNNNN) with tests.
- Schema (additive, interim `sales` untouched): `customers`, `sale_bills`, `sale_items`
  (`sale_items.movement_id` for exact cancel reversal).
- `src/db/billing.ts`: createSaleBill (one transaction; per-line FIFO with locked batches, SALE
  movement + links, cost/profit per line, bill no, totals, credit-needs-customer, audit log),
  cancelSaleBill (restores exact batch qty from links, marks cancelled, audit), listSaleBills.
- `drizzle/0000_violet_the_fury.sql` baseline captured with `drizzle-kit pull` (current DB state).
  New tables are NOT pushed yet (no dev branch).

## In progress (exact point where work stopped)
- File: —
- What was half-done: nothing; last green state.

## Next task
Finish V2-P10.

## Next exact step (one action the next session does first)
1. **USER ACTION:** create a Neon DEV branch → set `DATABASE_URL_TEST` in `.env`.
2. Push the 3 new tables to the DEV branch (`drizzle-kit push`; `generate` currently needs an
   interactive TTY — see DECISIONS 2026-10-31), then write/run the int test:
   Rice 1kg@₹10 + 3kg@₹12, sell 2kg @₹15 → cost 2200, profit 800; cancel → batches 1kg + 3kg.
3. Screens with data-testid + e2e: New Sale (Enter line, F2 save), Sales list (filters + cancel modal),
   Profit report; Dashboard cards (today sales/profit, month profit). Wire nav + routes.
4. Only after int tests + suite green: push same schema to the main DB; tick V2-P10.

## Files / tests
- New: src/logic/{profit,billNumber}.ts(+tests), src/db/billing.ts, drizzle/ (baseline)
- `npm test` → billNumber 4 + profit 5 new; full suite expected 175 (run before commit)
- `npx tsc --noEmit` → clean · e2e not re-run (no UI change)

## Blockers / notes
- ⚠ No `DATABASE_URL_TEST` yet → cannot push/verify billing tables (spec: dev first).
- Keychain items are allow-all on this Mac — do NOT re-add ACLs.
- Interim `sales` table/page still active; V2 screens will replace them, then drop the old table.
- Spec rule still open: replay.ts must replay SALE movements (edit of old purchase recomputing sale
  cost/profit) — NOT done yet; include when the screens land.
