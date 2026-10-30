# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 00:35 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
**Billing + Bills are live.** Next: Profit report + Dashboard cards, then charts (docs/PLAN_ANALYTICS.md)
→ V2-P11 credit → Funds tab.

## Status
- [x] GST Billing + printable GST invoice  ·  [x] Bills list (issued/cancelled, view, cancel)
- [~] V2-P10 remaining: profit report, dashboard cards, int test, replay SALE
- [ ] Charts/Funds/Investors  ·  [ ] V2-P11 … P17

## Done this session (2026-10-31)
- Invoice redesigned to the SDHHE sample: logo monogram, GSTIN/address/phone/email header, invoice boxes,
  buyer GSTIN+address, HSN per line, CGST/SGST rate+amount, amount in words, bank, terms, signature,
  watermark, DD-MM-YYYY. New columns: customers.gstin, sale_bills.gst_rate_bp, sale_items.hsn_code.
  Settings holds email + bank details. 192 tests green, tsc clean.
- P10 logic (tests first): profit.ts, billNumber.ts (SD-YYYY-NNNNNN), gst.ts (basis points, exact
  CGST/SGST split). 187 tests / 33 files green, tsc clean.
- Tables applied additively: customers, sale_bills, sale_items (movement_id for exact cancel).
- db/billing.ts: createSaleBill (one tx: bill no, per-line FIFO with locked batches, SALE movement +
  links, cost/profit, totals, credit-needs-customer, audit), cancelSaleBill (restore from links,
  mark cancelled, audit), listSaleBills, getSaleBill, createCustomer.
- UI: **GST Billing** (`/billing`) with line entry (Enter adds), live GST 0/5/12/18/28%, discount,
  payment, paid, F2 save, bill preview + **Print / Save as PDF** (hidden iframe; shared
  `src/lib/printBill.ts`); Settings → **Shop details** (name/address/phone/GSTIN).
- UI: **Bills** (`/bills`): issued + cancelled with badges, search + status filter, View (lines,
  CGST/SGST, total/paid, print), Cancel with in-app confirm → stays visible as cancelled and stock is
  restored to the exact batches.
- In-app **View Bill** = the real invoice layout (same HTML as print). Verified on SD-2026-000002: header/GSTIN,
  buyer GSTIN+address, HSN 090111, CGST/SGST, amount in words, bank, terms, signature, watermark.
- End-to-end proof on the real DB: bill SD-2026-000001 (₹75 + ₹3.75 GST = ₹78.75, cost ₹50, profit ₹25,
  FIFO batch 1000→500 g) then cancelled via Bills → cancelled=true, batch back to 1000 g, audit
  "Sale SD-2026-000001 cancelled; stock restored".

## In progress (exact point where work stopped)
- File: —
- What was half-done: nothing; last green state.

## Next task
V2-P10 finishing: Profit report + Dashboard cards (today sales/profit, month profit).

## Next exact step (one action the next session does first)
1. Profit report page using sale_items (revenue/cost/profit/margin by day/month/item/customer, cancelled
   bills excluded) with data-testid + page test; Dashboard cards from the same query.
2. Then charts phase per docs/PLAN_ANALYTICS.md (Recharts; Dashboard tabs Overview/Graphs/Funds/Investors).
3. replay.ts must include SALE movements when an old purchase is edited; then int test on DEV branch
   once DATABASE_URL_TEST exists.

## Files / tests
- New: src/logic/{profit,billNumber,gst}.ts(+tests), src/db/billing.ts, src/lib/printBill.ts,
  src/pages/{Billing,Bills}.tsx(+tests)
- `npm test` → 187 passed (33 files) · `npx tsc --noEmit` → clean
- Tables on the current DB (additive); drizzle baseline in drizzle/

## Blockers / notes
- ⚠ Still no DATABASE_URL_TEST (dev branch) → int tests + future migrations on dev blocked.
- Test data present: 2× test purchase 1 kg @₹100 (batches 2 & 3) + cancelled test bill SD-2026-000001.
  Delete test purchases in Purchases if unwanted; the cancelled bill stays visible by design.
- Interim `/sales` page (old) still exists next to the new GST Billing/Bills.
- Keychain items allow-all on this Mac; `ollama` not installed.
