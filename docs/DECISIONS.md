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
