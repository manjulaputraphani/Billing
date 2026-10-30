# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-30 23:26 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
V2 program received → docs/PLAN_V2.md (Phases 10–17). Nothing of V2 is built yet.
Next: **V2-P10 Sales + Profit**. Rule: ONE phase per session.

## Status
- [x] Interim v1 work (see below)  ·  [ ] V2-P10 … V2-P17 (none started)

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

## In progress (exact point where work stopped)
- File: —
- What was half-done: nothing.

## Next task
**V2-P10 — Sales + Profit** (read docs/PLAN_V2.md §PHASE 10).

## Next exact step (one action the next session does first)
1. Create a Neon DEV branch, set its URL as `DATABASE_URL_TEST` in `.env` (gitignored) — required before
   any V2 DB work; this also un-skips `db/*.int.test.ts`.
2. V2-P10: write `src/logic/profit.test.ts` first (FIFO example: 1kg@₹10 + 3kg@₹12, sell 2kg @₹15 →
   revenue 3000, cost 2200, profit 800; cancel restores 1kg + 3kg), then schema
   (customers, new `sales` bill header, `sale_items`), generate + push migration to the DEV branch.
3. Replace the empty interim `sales` table in that migration; keep `activity_log` until V2-P14.
4. Every new screen: data-testid + an e2e test (per V2 rules).

## Files / tests
- Last commits: 57fe68f (audit+bills), 8095f4f (security), af2e79b (UI), 3816cb3 (interim sales)
- `npm test` → 166 passed · `npx tsc --noEmit` → clean · e2e 13 passed / 1 skipped · cargo not re-run

## Blockers / notes
- ⚠ No dev branch / `DATABASE_URL_TEST` yet → V2 DB work cannot start until the user creates it.
- App points at the shared production DB; any test rows are REAL.
- Keychain items are allow-all on this Mac — do NOT re-add ACLs (would re-break dev).
- `ollama` is not installed — AI phases (P13 photo OCR, P17 bill reader) need it.
- Spec conflicts to respect: interim sales → replaced by V2-P10; `activity_log` → base for V2-P14
  `audit_log`; interim audit already records login/lock, keep logging until P14 migrates it.
