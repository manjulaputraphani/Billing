# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 00:20 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
**GST Billing is live** (V2-P10 core). Next: Sales list + cancel UI, Profit report, Dashboard cards,
then analytics (approved docs/PLAN_ANALYTICS.md) → V2-P11 credit → Funds tab.

## Status
- [x] GST Billing screen + printable GST invoice  ·  [~] V2-P10 remaining screens/report
- [ ] Charts/Funds/Investors  ·  [ ] V2-P11 … P17

## Done this session (2026-10-31)
- P10 logic (tests first): profit.ts, billNumber.ts (SD-YYYY-NNNNNN), gst.ts (inclusive/exclusive,
  rate in basis points, exact CGST/SGST split).
- Schema + tables applied additively: customers, sale_bills, sale_items (movement_id for exact cancel).
- db/billing.ts: createSaleBill (one tx: bill no, per-line FIFO + locked batches, SALE movement +
  links, cost/profit per line, totals, credit-needs-customer, audit), cancelSaleBill (exact restore),
  listSaleBills, getSaleBill, createCustomer.
- UI: **GST Billing** page (`/billing`, nav "GST Billing"): line entry (Enter adds), live totals,
  GST 0/5/12/18/28%, discount, payment mode, paid, F2 save, bill preview with **Print / Save PDF**
  (hidden iframe → system print dialog; CGST/SGST shown). Settings → **Shop details** (name, address,
  phone, GSTIN) printed on the bill.
- Tests: 183 passed / 32 files; tsc clean.

## In progress (exact point where work stopped)
- File: —
- What was half-done: nothing; last green state.

## Next task
Finish V2-P10 UI: Sales list (filters + cancel modal), Profit report, Dashboard cards.

## Next exact step (one action the next session does first)
1. **USER ACTION (2 min):** Settings → Shop details → enter shop name, address, phone, GSTIN → Save.
   Add a purchase first (Add Purchase) so there is stock to bill.
2. Then in the app: GST Billing → pick item, qty, rate → Add → Save bill (F2) → Print / Save PDF.
3. Next session: Sales list + cancel UI (uses listSaleBills/cancelSaleBill), Profit report
   (profit.ts + sale_items), Dashboard cards; then charts per docs/PLAN_ANALYTICS.md.
4. Replay.ts SALE handling (edit old purchase → recalc sale cost/profit) still TODO.

## Files / tests
- New: src/logic/{profit,billNumber,gst}.ts(+tests), src/db/billing.ts, src/pages/Billing.tsx(+test)
- `npm test` → 183 passed (32 files) · `npx tsc --noEmit` → clean · e2e not re-run (new page)
- Tables pushed to the current DB (additive); drizzle baseline in drizzle/

## Blockers / notes
- ⚠ Still no DATABASE_URL_TEST (dev branch) → integration tests + future migrations on dev blocked.
- Stock is 0 until a purchase is added — a bill without purchases shows "Not enough stock: …".
- Interim `/sales` page (old single-item sales) still exists; V2 GST Billing is the real one.
- Keychain items allow-all on this Mac; don't re-add ACLs. `ollama` not installed.
