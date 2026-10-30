# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-30 23:21 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
Phase 11 (audit trail, expense vendor, bill attachments) DONE. Only T-10.1 real-DB verification is
left: no purchase/sale has been entered yet, so `sales`, `batches`, `stock_movements` are still 0.

## Status
- [x] Phase 11  ·  [x] UI polish  ·  [x] Security settings  ·  [ ] T-10.1 real-DB verified

## Done this session
- Keychain bug FIXED: DATABASE_URL/PIN_HASH re-created allow-all (`security ... -A`), verified silent
  reads from another process. Cause: ad-hoc dev binaries change code signature on every Rust rebuild,
  macOS re-prompted. Trade-off + revert steps in DECISIONS.md (2026-10-30 entries).
- Neon verified (same DB the app uses): item "ROBUSTA P BERRY" id=1 saved.
- T-10.1 sales: `sales` table, 'SALE' movement type, logic/sales.ts planSale (FIFO, revenue rounding,
  oversell reject), db/sales.ts saveSale + listSales, pages/Sales.tsx, route /sales + nav.
- T-10.2 UI polish: stone palette, dark grouped sidebar, .card/.btn/.input classes, Setup/Lock redesigned.
- T-10.3 Security settings: keychain status (no values), Lock now, Change PIN (current PIN checked,
  4-6 digits), Remove AI key.
- Phase 11: `activity_log` (at, actor, event, summary, entity, entity_id) records login, lock, reset and
  every create/update/delete (item, purchase, stock entry, sale, expense). db/activity.ts logActivity
  joins the data transaction when there is one and never blocks the action. Settings "Recent activity".
  `expenses.paid_to` ("Paid to (vendor)") in form + table. `expense_bills` stores the bill/invoice
  (base64, max 4 MB, image or PDF) with "Save bill" download. All migrations additive, applied to Neon.

## In progress (exact point where work stopped)
- File: —
- What was half-done: nothing.

## Next task
Finish T-10.1 verification; then T-6.2/T-6.3 (Reports page, Excel/PDF/backup) are still missing.

## Next exact step (one action the next session does first)
- In the app: Add Purchase for ROBUSTA P BERRY → Sales → sell some qty at a price, then add an expense
  with vendor + bill; count rows (sales, batches, stock_movements, activity_log, expense_bills) with
  node --env-file=.env + @neondatabase/serverless (read-only, never print the URL); tick T-10.1.

## Files touched this session
- src/App.tsx, src/App.css, src/components/Layout.tsx
- src/db/{schema,items,purchases,stock,sales,expenses,activity,sales}.ts
- src/logic/sales.ts(+test), src/pages/{Sales,Settings,Expenses,Lock,Setup}.tsx (+tests)
- docs/{BUILD_PLAN,DECISIONS}.md

## Tests
- `npm test` → 166 passed / 0 failed (28 files)
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
- activity_log actor is always 'local' (single-user desktop app).
