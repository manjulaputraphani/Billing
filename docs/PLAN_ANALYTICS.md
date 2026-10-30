# DRAFT — Analytics, Funds & Investors (awaiting approval)

Status: APPROVED 2026-10-31. Decisions: Recharts; Dashboard tabs (Overview · Graphs · Funds · Investors); funds = actual cash position; execution order P10 → charts → P11 → funds.

## Goal
1. Dashboard with graphs/trends: many chart cards, user-selectable, with a fixed basic BAR chart and PIE chart.
2. "Funds with us" tab: money available vs utilised (in stock, in credit), with charts.
3. "Who invested how much" tab: investors, investments, totals, shares, timeline.

## Dependencies
- V2-P10 (sales bills/profit) → sales/profit charts need real bill data.
- V2-P11 (credit: paid_paise, customer/supplier payments) → receivables, payables, true cash position.
- Investors tab is independent and can be built anytime (needs 2 small tables).
- DATABASE_URL_TEST (dev branch) still required before any schema work.

## Proposed sequencing
1. Finish V2-P10 (sales + profit) first — already in progress.
2. A1 — Chart foundation + Dashboard tabs (works on current data; grows as P10/P11 land).
3. A2 — Investors tab (independent; can be done in parallel).
4. Finish V2-P11 (credit) → A3 — Funds tab (needs paid/credit data).
5. Later: GST/expiry charts fold into the same dashboard (P13).

## Layout (proposed)
Dashboard becomes a tab strip: **Overview · Graphs · Funds · Investors** (state in URL hash so it survives reload).

## Chart inventory
Always on (the "basic two"):
1. BAR — Sales vs Purchases vs Expenses per day/week (grouped).
2. PIE/DONUT — choose metric: stock value by item/category / expense categories / funds split.
User-selectable cards (remembered in settings):
3. LINE — Revenue vs Profit trend (daily).
4. BAR — Profit per day/week.
5. DONUT — Funds split: Stock · Receivables · Cash/Bank · Supplier advances.
6. PIE — Expenses by category.
7. H-BAR — Top 5 items by revenue / by stock value.
8. LINE — Stock value trend (rebuilt from purchase/sale movements).
9. BAR — Top 5 customers by receivables (after P11); Top 5 suppliers by payables.
10. LINE — Cumulative investments by investor (Investors tab).
11. BAR — GST collected vs input per month (after P13).
12. STACKED BAR — Usage vs wastage per month.
Every chart: range selector (7 / 30 / 90 days, this month, custom), tooltip in ₹ (en-IN), empty state.

## Funds tab (proposed definition)
- Money received = sale paid_paise + customer_payments.
- Money paid out = purchase paid_paise + expenses + supplier_payments.
- **Funds with us (cash/bank)** = Σ investments + money received − money paid out.
- **Utilised** = stock value (open batches at cost) + customer receivables (+ supplier advances).
- Show: 3 KPI cards (With us / In stock / In credit), then bar + donut charts, plus a reconciliation table.
- (Alternative simpler definition if preferred: investments + sales revenue − purchases − expenses.)

## Investors tab
Tables: `investors(id, name, phone, note, created_at)`, `investments(id, investor_id, amount_paise,
invested_on, mode, note, created_at)`.
Screen: investor list with total + share %, add investor/investment, ledger per investor, pie by
investor, cumulative line chart. Withdrawals can be phase 2 (negative entries).

## Data model additions
- `investors`, `investments`.
- Dashboard chart selection stored in existing `settings` table (key `dashboard_charts`).
- No other tables; funds/analytics are computed queries + pure `src/logic/funds.ts`, `src/logic/analytics.ts`.

## Tests
- `logic/funds.test.ts` (cash equation, utilisation, advance handling).
- `logic/analytics.test.ts` (period grouping, profit/margin aggregation).
- Page tests (mock db) for tab switching + chart selection persistence.
- e2e: tabs switch, basic BAR + PIE render (selectors by data-testid), investors add → list updates.
- Screenshot check on the running app.

## New dependency (needs a DECISIONS entry)
- Recharts (React charting, responsive, works in the Tauri webview) — unless the user prefers Chart.js
  or hand-rolled SVG (no dependency, more work).
