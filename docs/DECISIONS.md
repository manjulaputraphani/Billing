# DECISIONS LOG (append one line per decision: date · decision · reason)

- 2026-10-30 · Tauri 2 + React + TS (not Electron) · small installers, React skills
- 2026-10-30 · Neon Postgres as primary DB · data safe across laptops, free plan
- 2026-10-30 · Money in paise, qty in base units (int) · no float errors
- 2026-10-30 · FIFO default, weighted average optional · matches real usage
- 2026-10-30 · AI computes nothing; app computes stats, AI explains · LLMs bad at arithmetic
- 2026-10-30 · Secrets in OS secure storage only · desktop app has no server
- 2026-10-30 · `keyring` crate for secrets (not a JS plugin / not stronghold) · native macOS Keychain & Windows Credential Manager, no extra vault file or password
- 2026-10-30 · `argon2` crate for PIN hashing, argon2id + random salt · memory-hard, no plaintext PIN on disk
- 2026-10-30 · `rand_core` added only to enable its `getrandom` feature · argon2 needs OsRng for the salt; reuses the version already in the tree
- 2026-10-30 · `@types/node` (devDependency) · `src/db/test-utils.ts` reads `process.env.DATABASE_URL_TEST`; removes the old `@ts-expect-error` in vite.config.ts
- 2026-10-30 · `@playwright/test` (devDependency) + e2e/ specs · runs the real React UI in Chromium with Tauri IPC stubbed; the only automated check of the Setup→Lock→Home flow without a GUI
- 2026-10-30 · `@tauri-apps/plugin-http` + `tauri-plugin-http` · Ollama calls go through Rust, bypassing webview CORS; capability scope limited to http://localhost:11434/* and https://ollama.com/*
- 2026-10-30 · Sales = `sales` table + `SALE` stock movement with FIFO batch links · stock left stays one source of truth (sum of open batches), no duplicate counters
- 2026-10-30 · Sale price stored as paise per display unit (kg/l/pcs), total = round(qty × price / factor) · matches batch costing and avoids float money
- 2026-10-30 · keychain items DATABASE_URL/PIN_HASH re-created allow-all on this dev Mac (`security ... -A`) · ad-hoc dev binaries change code signature on every Rust rebuild, so macOS re-prompted forever; app still uses keyring, revert by deleting the items + redoing Setup
- 2026-10-30 · Audit trail in `activity_log` (actor 'local') · single-user desktop app; rows answer who did what and when, share the data transaction, and travel with the DB backup
- 2026-10-30 · Expense bills stored as base64 inside Postgres (`expense_bills`, 4 MB cap) · no bucket or local file paths to sync; one backup keeps the paperwork, small enough for the HTTP driver
