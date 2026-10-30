# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-30 17:50 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
T-0.5 — Neon project + `dev` branch (needs the human). Bootstrap T-0.1→T-0.4 is DONE.

## Status
- [x] done

## Done this session
- Bootstrap steps 2–14 run end to end.
- Tauri 2 + React 19 + TS + Vite 8 scaffolded (was app-tmp, renamed).
- Renamed: package.json `stock-tracker`, tauri.conf.json productName `Stock Tracker` / identifier `com.stocktracker.app`, Cargo package `stock-tracker` (lib kept `app_tmp_lib`).
- Installed base deps + drizzle-orm, @neondatabase/serverless, zod, recharts, xlsx, jspdf, react-router-dom, drizzle-kit, vitest, RTL, jsdom, tailwindcss, @tailwindcss/vite, dotenv.
- Scripts added: test, test:watch, typecheck, db:push.
- vite.config.ts: tailwindcss plugin + `test` block (jsdom, globals, setupFiles). `/// <reference types="vitest/config" />` first line.
- src/test/setup.ts, src/test/smoke.test.ts, src/App.css = `@import "tailwindcss";`.
- Folders src/db|logic|pages|components|ai with .gitkeep.
- .env.example created; .gitignore has `.env` + added `!.env.example` (`.env.*` was swallowing the example).
- git init + commit `T-0.1 to T-0.3: Tauri React TS project + kit + test setup`.

## In progress (exact point where work stopped)
- File: —
- What was half-done: nothing; bootstrap finished.

## Next task
T-0.5  (after it: T-1.1)

## Next exact step (one action the next session does first)
- Human: create Neon project (Singapore) + `dev` branch, paste dev URL into `.env` as DATABASE_URL. Then agent starts T-1.1.

## Files touched this session
- package.json, vite.config.ts, src-tauri/tauri.conf.json, src-tauri/Cargo.toml
- .gitignore, .env.example, src/App.css
- src/test/setup.ts, src/test/smoke.test.ts
- src/{db,logic,pages,components,ai}/.gitkeep
- docs/BUILD_PLAN.md, HANDOVER.md

## Tests
- Last run: `npm test` → 1 passed / 0 failed (smoke)
- `npm run typecheck` → clean; `npm run build` → OK (dist 221 kB js)

## Blockers / errors (paste only the key error line)
- `ollama -v` → `command not found`. Not needed until the opencode.json model is used; T-0.1 ticked with this caveat.
- `npm audit`: xlsx has a high-severity advisory (prototype pollution / ReDoS), **no fix available** on npm. Revisit in T-? (csv/xlsx export) — consider SheetJS CDN build.

## Notes for next session
- `npm run tauri dev` has NOT been run yet (never verified the window; first Rust build 5–10 min).
- GitHub push not done (human: `git remote add origin <url>` + `git push -u origin main`).
- Vite 8 / TS 6 / Rust edition 2024 — newer than docs may assume.
- Window title in tauri.conf.json still "app-tmp" (cosmetic, untouched).
