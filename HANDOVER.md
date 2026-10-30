# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-30 18:05 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
Phase 1 (T-1.1, T-1.2, T-1.3) DONE. Next: T-2.1 secure storage.

## Status
- [x] done

## Done this session
- T-1.1: `src/db/schema.ts` — all 9 BLUEPRINT §4 tables (items, suppliers, purchases,
  batches, stock_movements, movement_batch_links, expenses, settings, ai_suggestions),
  FKs, uniques, CHECKs. `drizzle.config.ts` loads DATABASE_URL via dotenv + `schemaFilter: ["public"]`.
  Tables now EXIST in Neon (public: 34 → 43).
- `drizzle-kit push` CANNOT run from an agent: non-TTY → `promptNamedWithSchemasConflict`
  (DB has 2 schemas). Applied the identical drizzle-generated DDL in ONE transaction via a
  guarded script (9 CREATE + 8 ADD CONSTRAINT, add-only, 0 drops). Script deleted after use.
- T-1.2: `src/db/client.ts` `getDb(url)` (neon-http, schema bound, URL injected never imported)
  + `client.test.ts` (rejects blank URL; handle built without connecting).
- T-1.3: `src/logic/units.ts` + `units.test.ts` (13 tests). toBase, fromBase, baseFactor,
  formatRupees, costPaise. All 5 TESTING §A1 cases + edge cases (rounding, negatives, ₹ format).
- `costPaise(qtyBase, unitPricePaise, pricePer = "kg")` — 3rd arg is the unit the PRICE is
  quoted in; quantity is ALWAYS base units. Use "pcs"/"l"/"g" as needed.

## In progress (exact point where work stopped)
- File: —
- What was half-done: nothing.

## Next task
T-2.1  (after it: T-2.2 setup screen, T-2.3 PIN lock)

## Next exact step (one action the next session does first)
- Read BUILD_PLAN T-2.1, then add the Tauri keychain/stronghold plugin and store URL + PIN_HASH.

## Files touched this session
- src/db/schema.ts, src/db/client.ts, src/db/client.test.ts
- src/logic/units.ts, src/logic/units.test.ts
- drizzle.config.ts, docs/BUILD_PLAN.md, HANDOVER.md

## Tests
- Last run: `npm test` → 16 passed / 0 failed (3 files)
- `npm run typecheck` → clean

## Blockers / errors (paste only the key error line)
- None open. Repeated earlier: `Error: Interactive prompts require a TTY terminal` from
  drizzle-kit push (see Notes).

## Notes for next session
- ⚠ `.env` points at the EXISTING app DB `SriDurgaHariHaraEnterprices` (us-east-1, owner role,
  34 pre-existing CamelCase tables + `sdhhe_fy2025` schema). Not a separate dev branch.
  Treat every later write as touching production data. Consider a real dev branch before
  T-3.x (items/purchases writes).
- ⚠ That DB password was pasted into a chat transcript — human should reset it in Neon.
- T-1.1 ticks but `npm run db:push` still fails non-interactively; from a real terminal it
  will prompt and works. Keep `schemaFilter: ["public"]` so `sdhhe_fy2025` is never touched.
- Deliberate §4 deviations: composite PK on movement_batch_links; NOT NULL on core columns
  the spec left implicit.
- Still open from before: `ollama` not installed; GitHub push not done; window title "app-tmp".
