# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-30 17:50 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
T-1.1 — Schema (HARD BLOCKED: the DB in `.env` is an existing production app, not a dev branch).

## Status
- [ ] blocked  (code written + validated offline; push deliberately NOT run)

## Done this session
- T-1.1 code: `src/db/schema.ts` (all 9 tables per BLUEPRINT §4, FKs, uniques, checks) + `drizzle.config.ts` (dotenv, throws a clear error if DATABASE_URL missing).
- Schema validated OFFLINE: `drizzle-kit generate` with a dummy URL emitted correct SQL (items, suppliers, purchases, batches, stock_movements, movement_batch_links, expenses, settings, ai_suggestions). Temp `drizzle/` migration deleted again (project uses `push`).
- typecheck clean, tests 1/1.

## In progress (exact point where work stopped)
- File: src/db/schema.ts, drizzle.config.ts
- What was half-done: T-1.1 NOT ticked. Only acceptance test `npm run db:push` is missing.

## Next task
T-1.1 finish → then T-1.2 (client.ts) → T-1.3 (units.ts + tests)

## Next exact step (one action the next session does first)
- Human: create `.env` in the project root (`cp .env.example .env`) and paste the Neon dev URL as DATABASE_URL. Then agent runs `npm run db:push`.

## Files touched this session
- src/db/schema.ts (new), drizzle.config.ts (new), HANDOVER.md

## Tests
- Last run: `npm test` → 1 passed / 0 failed
- `npm run typecheck` → clean

## Blockers / errors (paste only the key error line)
- `npm run db:push` stops at `Interactive prompts require a TTY terminal` in `promptNamedWithSchemasConflict` — because the target DB already has 42 tables.
- **WRONG DATABASE**: `.env` points at DB `SriDurgaHariHaraEnterprices` (us-east-1, `neondb_owner`). Read-only inspection found 42 tables belonging to an existing ASP.NET/EF Core app: `Users`, `Roles`, `RefreshTokens`, `Invoices`, `InvoiceItems`, `Ledgers`, `Payments`, `PurchaseOrders`, `StockItems`, `StockLedger`, `RoastBatches`, `BlendFormulas`, `__EFMigrationsHistory`, plus a custom schema `sdhhe_fy2025` (5 tables).
- A push there would have added/renamed our tables inside a live system. NOTHING was written — push failed before applying; none of our 9 tables exist.
- SECURITY: that URL (owner role, with real password) was pasted into a chat transcript. Reset the password.

## Notes for next session
- T-1.1 is NOT done. Do not tick it. Do not run `db:push` until the human supplies a URL for an EMPTY Neon database (separate project or a real `dev` branch) that contains none of the 42 tables above.
- Verify any new URL with the read-only check in HANDOVER history: `select table_schema, table_name from information_schema.tables` → must return 0 rows.
- Deliberate deviations from §4 (all additive, no columns changed): composite PK on movement_batch_links(movement_id, batch_id); NOT NULL on core columns the spec left implicit (batches.qty*, unit_price_paise, purchase_date, etc.).
- Do NOT create `.env` yourself in future — human pastes the URL.
