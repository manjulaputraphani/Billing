# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-30 18:10 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
Phase 2 (T-2.1, T-2.2, T-2.3) DONE. Next: T-3.1 Items CRUD.

## Status
- [x] done

## Done this session
- T-2.1 Rust: `keyring` 3 (apple/windows/secret-service) + `argon2` 0.5 (+`rand_core` getrandom)
  in Cargo.toml. lib.rs commands: save_secret/get_secret/delete_secret/hash_pin/verify_pin,
  service "stock-tracker". `cargo check` clean. `greet` demo command REMOVED.
  TS wrappers: src/lib/secrets.ts (SECRET_KEYS, save/get/deleteSecret, hashPin, verifyPin).
- T-2.2: src/pages/Setup.tsx — URL field, "Test connection" via `pingDb` (`select 1`,
  added to src/db/client.ts), PIN + confirm (4-6 digits), errors "Cannot connect - check the
  connection string" / "PINs do not match", saves DATABASE_URL + PIN_HASH.
  src/lib/url.ts `hostOf`/`hostLabel` — UI only ever shows the host, never the full URL.
  tauri.conf.json: strict `csp` + `devCsp` (https://*.neon.tech in connect-src).
- T-2.3: src/pages/Lock.tsx (5 wrong → 60 s countdown, input+button disabled), Home.tsx
  (placeholder + "Reset connection" in-app modal deleting both secrets), App.tsx flow
  loading→Setup|Lock→Home, src/lib/db-context.tsx (DbProvider/useDb; db only after unlock).
- DECISIONS.md: three lines added for keyring / argon2 / rand_core.

## In progress (exact point where work stopped)
- File: —
- What was half-done: nothing.

## Next task
T-3.1  (Items CRUD: src/pages/Items.tsx, src/db/items.ts, zod validation, unique name)

## Next exact step (one action the next session does first)
- Read BUILD_PLAN T-3.1, then create src/db/items.ts queries + zod schema and the Items page.

## Files touched this session
- src-tauri/Cargo.toml, src-tauri/src/lib.rs, src-tauri/tauri.conf.json
- src/lib/{secrets.ts,url.ts,db-context.tsx}, src/db/client.ts
- src/pages/{Setup.tsx,Setup.test.tsx,Lock.tsx,Lock.test.tsx,Home.tsx}
- src/App.tsx, src/App.test.tsx
- docs/DECISIONS.md, docs/BUILD_PLAN.md, HANDOVER.md

## Tests
- Last run: `npm test` → 31 passed / 0 failed (7 files)
- `npm run typecheck` → clean; `cargo check` → clean

## Blockers / errors (paste only the key error line)
- None open.

## Notes for next session
- Verified: `tauri dev` builds (12 s warm) and runs with the new CSP; JS executes under it.
  The neon banner "Running SQL directly from the browser" prints on import — harmless noise.
- ⚠ `.env` + the app now point at the EXISTING app DB `SriDurgaHariHaraEnterprices`
  (34 CamelCase tables + `sdhhe_fy2025`). T-3.x writes REAL rows. Get a real dev branch first.
- ⚠ DB password was pasted in a chat transcript earlier — reset it in Neon.
- Manual check for a clean first-run: delete the two keychain entries or use "Reset connection".
- Still open from before: `ollama` not installed; GitHub push not done; window title "app-tmp".
