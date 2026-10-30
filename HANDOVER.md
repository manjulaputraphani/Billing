# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-30 23:15 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
Phase 10: T-10.1 (sales) awaiting ONE real purchase + sale; T-10.2 (UI) and T-10.3 (security)
are DONE (T-10.1 checkbox not ticked yet).

## Status
- [x] Sales built  ·  [x] UI polish  ·  [x] Security settings  ·  [ ] T-10.1 real-DB verified  ·  [ ] T-6.2/T-6.3 missing

## Done this session
- Keychain bug FIXED: DATABASE_URL/PIN_HASH re-created allow-all (`security ... -A`), verified silent
  reads from another process. Cause: ad-hoc dev binaries change code signature on every Rust rebuild,
  macOS re-prompted. Trade-off + revert steps in DECISIONS.md (2026-10-30 entries).
- Neon verified (same DB the app uses): item "ROBUSTA P BERRY" id=1 saved; all other tables were empty.
- T-10.1 sales: `sales` table (qty_base, unit_price_paise, total_paise, sold_at, movement_id) and
  'SALE' added to stock_movements check. `src/logic/sales.ts` planSale (FIFO, revenue rounding,
  oversell reject). `src/db/sales.ts` saveSale (one tx: lock batches, FIFO take, movement + links,
  sales row) + listSales. `src/pages/Sales.tsx` (live revenue/left preview, sold-details table),
  route /sales, nav "Sales". Migration applied manually to Neon (additive only).
- T-10.2 UI polish: warm stone palette, dark grouped sidebar, card/button/input component classes
  applied across pages, refined tables + focus rings; Setup/Lock redesigned. No text/label/heading
  changes, so all test selectors still match.
- T-10.3 Security settings: Keychain status card (PIN / connection / AI key, values never shown),
  Lock now (back to lock screen without quitting), Change PIN (current PIN checked, 4-6 digits,
  confirm), Remove AI key. `src/pages/Settings.test.tsx` 6 tests.

## In progress (exact point where work stopped)
- File: —
- What was half-done: nothing.

## Next task
Finish T-10.1 verification (then consider T-6.2/T-6.3).

## Next exact step (one action the next session does first)
- In the app: Add Purchase for ROBUSTA P BERRY, then Sales → sell some qty at a price; count rows
  (sales, batches, stock_movements) with node --env-file=.env + @neondatabase/serverless
  (read-only, never print the URL); tick T-10.1 when the numbers match.

## Files touched this session
- src/App.tsx, src/App.css, src/components/Layout.tsx, src/db/{schema,sales}.ts, src/logic/sales.ts(+test)
- src/pages/Sales.tsx(+test), src/pages/Settings.tsx(+test), docs/{BUILD_PLAN,DECISIONS}.md

## Tests
- `npm test` → 164 passed / 0 failed (28 files)
- `npx tsc --noEmit` → clean
- `npm run test:e2e` → 13 passed, 1 skipped (needs DATABASE_URL_TEST)
- `cargo check` → not re-run (no Rust changes)

## Blockers / errors
- None.

## Notes for next session
- Dev Mac keychain items are allow-all now — do NOT "fix" by re-adding ACLs, it would re-break dev.
- App points at the shared production DB; any test rows are REAL.
- No DATABASE_URL_TEST → db/*.int.test.ts still skipped.
- `ollama` still not installed — Test AI / Chat need it.
