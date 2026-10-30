# BLUEPRINT — Stock Tracker (desktop, Neon cloud DB)

## 1. Goal
Track purchases, stock left, expenses and price changes per item. Same item bought at different prices
(₹10/kg then ₹12/kg) is stored as separate BATCHES. Usage is costed by FIFO (default) or weighted average.

## 2. Architecture
React UI (Tauri window) → logic (TypeScript, pure functions) → Drizzle → Neon Postgres (cloud).
Installers: Windows .exe/.msi, macOS .dmg, Linux .AppImage/.deb. Data in Neon ⇒ change laptop, log in, data back.

## 3. Units & money (STRICT)
- Item has `unit`: `kg` | `l` | `pcs`. Stored quantity is integer base unit: kg→grams, l→ml, pcs→pieces.
- Price stored as `unit_price_paise` per DISPLAY unit (per kg / per l / per pc). ₹12/kg = 1200.
- Cost of qty: `cost_paise = Math.round(qty_base * unit_price_paise / factor)`, factor = 1000 for kg/l, 1 for pcs.
- Display: paise/100 with 2 decimals, "₹". Grams/1000 for kg.

## 4. Data model (Postgres, Drizzle in src/db/schema.ts)
```
items(id serial pk, name text unique not null, unit text not null, category text,
      min_stock_base int default 0, created_at timestamptz default now())
suppliers(id serial pk, name text not null, phone text)
purchases(id serial pk, item_id fk, supplier_id fk null, qty_base int not null >0,
      unit_price_paise int not null >=0, total_paise int not null, purchase_date date not null,
      payment_mode text, note text, created_at timestamptz default now())
batches(id serial pk, purchase_id fk unique, item_id fk, qty_original int, qty_remaining int >=0,
      unit_price_paise int, purchase_date date)
stock_movements(id serial pk, item_id fk, type text check in
      ('PURCHASE','STOCK_CHECK','USAGE','WASTAGE','ADJUSTMENT'),
      qty_change int, cost_paise int, entered_qty_left int null, movement_date date, note text)
movement_batch_links(movement_id fk, batch_id fk, qty_taken int, unit_price_paise int, cost_paise int)
expenses(id serial pk, category text, amount_paise int, expense_date date, payment_mode text, note text)
settings(key text pk, value text)            -- costing_method = FIFO | AVERAGE
ai_suggestions(id serial pk, type text, item_id int null, message text, priority int,
      created_at timestamptz default now(), dismissed bool default false)
```

## 5. Core logic (src/logic/, PURE functions, no DB inside)
### fifo.ts
`allocateFifo(batches: {id, qtyRemaining, unitPricePaise, purchaseDate}[], qtyUsed, factor)`
→ `{ takes: {batchId, qty, unitPricePaise, costPaise}[], totalCostPaise }`
- Sort by purchaseDate asc, then id asc. Take from oldest until qtyUsed is covered.
- qtyUsed > total remaining → throw `InsufficientStockError`.
- qtyUsed = 0 → empty takes, cost 0.
### stockCheck.ts
`computeUsage(currentStock, enteredLeft)` → used = current − left. left > current → `StockLeftTooHighError`
("Check for a missed purchase"). left < 0 → validation error.
### average.ts
new_avg = (old_qty*old_avg + new_qty*new_price) / (old_qty+new_qty), round to paise.

### Worked example (MUST be a test)
Batch A: 1 kg (1000 g) @ ₹10/kg (1000 paise). Batch B: 3 kg @ ₹12/kg. Stock = 4 kg. Entered left = 2 kg.
Used = 2000 g → take 1000 g from A (₹10.00) + 1000 g from B (₹12.00) = ₹22.00 (2200 paise).
Remaining: B 2000 g, value ₹24.00. Weighted average: avg ₹11.50/kg, used cost ₹23.00.

## 6. Flows (each = ONE DB transaction)
- Add purchase: insert purchase → insert batch → insert PURCHASE movement.
- Stock check: read batches(qty_remaining>0) → computeUsage → allocateFifo → update batches → insert STOCK_CHECK movement + links.
- Edit/delete old purchase: recompute all later movements for that item (replay in date order).

## 7. Screens
Setup (Neon URL + PIN, first launch) · PIN lock · Dashboard · Items · Item detail (batches, price chart, usage) ·
Add Purchase · Stock Check (preview "used X, cost ₹Y" → confirm) · Expenses · Reports · AI Suggestions · Settings.

## 8. Security
Neon connection string + PIN hash + Ollama API key stored in OS secure storage (Tauri plugin, e.g. keyring/stronghold).
Never in code, git, or logs. PIN hashed (argon2/bcrypt), never stored plain.

## 9. AI suggestions (Phase 8)
App computes stats (src/logic/stats.ts). AI only explains. Level 1 rules (no AI) → Level 2 Ollama explains JSON stats
→ Level 3 chat with READ-ONLY tool functions. Send summaries only, never raw DB or secrets. Cache results in ai_suggestions.
