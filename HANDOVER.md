# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-30 23:24 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
V2-P10 Sales + Profit — IN PROGRESS. Done: `src/logic/profit.ts` (+5 tests). Next: schema/migration,
sale+cancel transactions, screens. BLOCKED on the Neon dev branch (`DATABASE_URL_TEST`).

## Status
- [x] Interim v1 work (see below)  ·  [~] V2-P10 (profit logic done, DB/screens pending)
  ·  [ ] V2-P11 … V2-P17

## Done this session (2026-10-30)
- Keychain bug FIXED: DATABASE_URL/PIN_HASH re-created allow-all (`security ... -A`); cause was ad-hoc
  dev binaries changing signature on every Rust rebuild. Trade-off/revert in DECISIONS.md.
- Interim sales (SUPERSEDED by V2-P10): logic/sales.ts planSale (FIFO, revenue, oversell), db/sales.ts,
  Sales page, `/sales` route — the interim `sales` table is EMPTY.
- UI polish: stone palette, dark grouped sidebar, `.card/.btn/.input` classes, Setup/Lock redesigned.
- Security settings: keychain status (no values), Lock now, Change PIN, Remove AI key.
- Audit: `activity_log` (login/lock/reset + item/purchase/stock/sale/expense changes, same transaction
  when one exists). `expenses.paid_to` vendor + `expense_bills` attachments (base64, 4 MB, image/PDF).
- V2 spec stored in docs/PLAN_V2.md; checklist + reconciliation in docs/BUILD_PLAN.md.
- V2-P10 progress: `src/logic/profit.ts` lineProfit/billProfit/marginPct + `profit.test.ts` (5 tests,
  FIFO example ₹30 − ₹22 = ₹8). No schema/DB work yet (dev branch missing).

## In progress (exact point where work stopped)
- File: —
- What was half-done: nothing.

## Next task
**V2-P10 — Sales + Profit** (read docs/PLAN_V2.md §PHASE 10).

## Next exact step (one action the next session does first)
1. **USER ACTION:** create a Neon DEV branch and set `DATABASE_URL_TEST` in `.env` (gitignored).
   Without it: no V2 migration may be pushed (spec) and db/*.int.test.ts stay skipped.
2. Then V2-P10 schema: `customers`, new `sales` bill header (bill_no SD-YYYY-NNNNNN, totals, payment,
   paid, cancelled), `sale_items` (qty_base, unit_price_paise, line_total_paise, cost_paise,
   profit_paise). `drizzle-kit generate` → push to the DEV branch → run int tests.
3. Replace the EMPTY interim `sales` table in that migration; keep `activity_log` until V2-P14.
4. DB layer: createSale (one tx: bill no sequence, per-line allocateFifo, SALE movement + links,
   sale_items), cancelSale (reverse links → restore batch qty, mark cancelled, no hard delete).
5. Screens: New Sale (Enter = add line, F2 = save), Sales list (filters + cancel modal), Profit report;
   Dashboard cards (today's sales/profit, month profit). data-testid + e2e per V2 rules.

## Files / tests
- Last commits: 57fe68f (audit+bills), 8095f4f (security), af2e79b (UI), 3816cb3 (interim sales)
- `npm test` → 171 passed (29 files) · `npx tsc --noEmit` → clean · e2e 13 passed / 1 skipped · cargo not re-run

## Blockers / notes
- ⚠ No dev branch / `DATABASE_URL_TEST` yet → V2 DB work cannot start until the user creates it.
- App points at the shared production DB; any test rows are REAL.
- Keychain items are allow-all on this Mac — do NOT re-add ACLs (would re-break dev).
- `ollama` is not installed — AI phases (P13 photo OCR, P17 bill reader) need it.
- Spec conflicts to respect: interim sales → replaced by V2-P10; `activity_log` → base for V2-P14
  `audit_log`; interim audit already records login/lock, keep logging until P14 migrates it.
