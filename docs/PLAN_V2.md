# FEATURES V2 — Phases 10 to 17 (source spec, added 2026-10-30)

Rules: same as AGENTS.md. ONE phase per session. Tests first for logic. Money = paise int, qty = base units int.
Every DB change = a new Drizzle migration (`npx drizzle-kit generate` then push to DEV branch first; main only after tests pass).
Every multi-step write = one transaction (getTxDb). Every new screen gets data-testid on key elements + an e2e test.

---

## PHASE 10 — Sales + Profit
### Data
```
customers(id, name, phone, address, created_at)
sales(id, bill_no text unique, customer_id null, sale_date, subtotal_paise, discount_paise, gst_paise default 0,
      total_paise, payment_mode (Cash|UPI|Card|Credit), paid_paise, note, cancelled bool default false, created_at)
sale_items(id, sale_id, item_id, qty_base, unit_price_paise, line_total_paise, cost_paise, profit_paise)
```
Add movement type `SALE` to stock_movements check. Bill number format: `SD-2026-000001` (yearly sequence).
### Logic
- Sale: for each line run allocateFifo → update batches, insert SALE movement + links, store cost_paise and
  profit_paise = line_total − cost. Whole bill in ONE transaction. Not enough stock → block that line with message.
- Cancel sale: restore exact batch quantities from movement_batch_links (reverse), mark cancelled. No hard delete.
- src/logic/profit.ts (pure, tests first): lineProfit, billProfit, marginPct.
- replay.ts must include SALE movements (edit old purchase recalculates sale costs/profit).
### Screens
- New Sale (fast billing): item search (name or barcode), qty, price (default = last selling price), lines table,
  discount, total, payment mode, customer (optional; required if Credit). Keyboard: Enter adds line, F2 save.
- Sales list: filter date/customer/payment mode, cancel button (in-app confirm modal).
- Profit report: by day / month / item / customer — revenue, cost, profit, margin %. Dashboard cards: today's sales,
  today's profit, month profit.
### Tests
FIFO example: Rice 1kg@₹10 + 3kg@₹12, sell 2kg @ ₹15 = ₹30 → cost ₹22, profit ₹8. Cancel → batches back to 1kg + 3kg.

---

## PHASE 11 — Credit (Udhaar) + Supplier dues
```
customer_payments(id, customer_id, amount_paise, payment_date, mode, note)
supplier_payments(id, supplier_id, amount_paise, payment_date, mode, note)
purchases: add paid_paise (default = total_paise; less if bought on credit)
```
- Customer balance = credit sales (total − paid) − payments. Supplier balance = purchases (total − paid) − payments.
- Screens: Customers (list with balance, ledger per customer, add payment), Suppliers (same).
- "Who owes me" list sorted by amount + days since last payment. Dashboard card: total receivable, total payable.
- Reminder text button: opens `https://wa.me/91<phone>?text=<encoded message>` with balance message (user sends manually).
- Tests: ledger math, partial payments, balance never silently negative (allow advance, show as "Advance ₹X").

---

## PHASE 12 — Pack units + Bill print/share
```
item_packs(id, item_id, pack_name text, base_qty int)   -- e.g. "Bag 25kg" = 25000 g, "Box" = 12 pcs
```
- Purchase/Sale forms: choose pack or base unit; convert to base qty before saving; show both ("2 Bags = 50.00 kg").
- Bill PDF (jspdf): shop name, address, phone, GSTIN (from Settings "Shop details"), bill no, date, lines, totals, "Thank you".
  Print button (window.print on a print view) + Save PDF (dialog) + Share on WhatsApp (wa.me text summary; tell user to attach the saved PDF).
- Tests: pack conversion, PDF generator returns a document with correct totals text.

---

## PHASE 13 — GST + Bill photo + Expiry
- items: add gst_rate_bp int (basis points: 5% = 500), hsn_code text. Sales/purchases store gst per line (CGST/SGST split equal, IGST option).
- Prices: Setting "prices include GST" yes/no. src/logic/gst.ts (pure, tests first): gstFromInclusive, gstOnExclusive, split CGST/SGST, rounding to paise.
- GST report per month: output GST (sales) − input GST (purchases), by rate; export Excel.
- Bill photo: purchases get attachment; save image file to app data folder (plugin-fs, appDataDir) and store path; show thumbnail; include in backup as separate folder export.
- Expiry: batches add expiry_date null. Purchase form optional expiry. FIFO option "FEFO" (earliest expiry first) in Settings.
  Alerts: expiring in ≤ 7 days, expired stock value. Write off expired → WASTAGE movement.
- Tests: GST math (₹105 incl 5% → base ₹100, GST ₹5, CGST ₹2.50, SGST ₹2.50), FEFO ordering.

---

## PHASE 14 — Barcode + Reorder list + Audit log
- items: add barcode text unique null. USB scanner acts as keyboard: on New Sale / Add Purchase a focused search box,
  Enter with exact barcode match adds the item. "Scan to add barcode" on item edit.
- Reorder list: items with days left ≤ reorder_days (Setting, default 7) or stock ≤ min → suggested qty = avg daily use × 14 − stock
  (round up to pack size). Group by preferred supplier (cheapest from supplier comparison). Export / share on WhatsApp as text.
- audit_log(id, at, user_name, action, table_name, row_id, before_json, after_json). Write in the same transaction for every
  create/update/delete/cancel. Screen: filter by date/table/user. Never editable.
- Tests: reorder qty math, audit row written on update and inside rollback nothing is written.

---

## PHASE 15 — Auto-update + Dark mode + Languages
- Auto-update: @tauri-apps/plugin-updater with GitHub Releases latest.json. Generate updater key pair (`npx tauri signer generate`),
  private key ONLY in GitHub secret TAURI_SIGNING_PRIVATE_KEY (+ password secret), public key in tauri.conf.json.
  Update release.yml to upload updater files. Settings: "Check for updates" + auto check on start (ask before installing).
- Dark mode: Tailwind dark variant, Setting Light / Dark / System, saved locally.
- Languages: i18next + react-i18next. English, Telugu, Hindi, Kannada. All UI strings moved to src/locales/<lang>.json.
  Numbers/₹ always formatted en-IN. Test: switching language changes Dashboard titles; no missing keys (script that compares key sets).

---

## PHASE 16 — Users/roles + Multiple locations + Accountant export + Daily summary
- users(id, name, pin_hash, role Owner|Staff, active). First user = Owner (migrate existing PIN). Lock screen: pick user + PIN.
  Staff: can add sales/purchases/stock checks; cannot see profit, reports, settings, delete/cancel. Record user_name in audit_log.
  NOTE in docs: roles are app-level (DB password is on the laptop), fine for family/staff, not strong security.
- locations(id, name) default "Main shop". batches + movements get location_id. Stock per location. Transfer screen
  (TRANSFER_OUT + TRANSFER_IN movements, FIFO from source, keeps original batch price). Reports filter by location.
- Accountant export: monthly Excel with sheets Sales, Purchases, Expenses, GST summary, Customer balances, Supplier balances
  (columns: Date, Voucher no, Party, Ledger, Amount, GST) — simple format importable/usable for Tally entry.
- Daily summary: button + optional auto at app close: today's sales, profit, expenses, low stock, receivables →
  open wa.me with text or mailto: with text. No server, no background sending.

---

## PHASE 17 — Offline mode + AI bill reader (advanced, use a strong model)
- Offline: local SQLite (tauri-plugin-sql) cache of items, batches and an outbox table. When offline: allow New Sale, Add Purchase,
  Stock Check, Expense → saved to outbox with client UUID. When online: replay outbox in order inside transactions on Neon,
  mark synced, show conflicts (e.g. not enough stock) for user to fix. Status pill: Online / Offline (N pending).
  Tests: outbox replay order, idempotency (same UUID twice → saved once), conflict path.
- AI bill reader: Add Purchase → "Read bill photo" → send image to a vision model on Ollama (model name Setting, e.g. a multimodal
  cloud model) asking for JSON lines [{itemName, qty, unit, unitPrice}] + supplier + date. Validate with zod, match items by name,
  show an editable preview — user MUST confirm; never auto-save. Mock AI in tests.

---

## LATER (not in this plan) — Mobile companion app
Separate project (React Native/Expo or a PWA) reading the same Neon DB through a small API with read-only access. Plan separately.
