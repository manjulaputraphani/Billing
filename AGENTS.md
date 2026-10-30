# AGENTS.md — Instructions for any AI coding agent (GLM / OpenCode / Claude Code)

Keep this file SHORT. It is loaded every session. Details live in /docs — read them only when a task needs them.

## Project
Desktop app "Stock Tracker": tracks purchases, stock left, expenses, price changes (batch/FIFO costing).
Stack: Tauri 2 + React + TypeScript + Vite + Tailwind | DB: Neon Postgres via Drizzle ORM + @neondatabase/serverless | Tests: Vitest + React Testing Library.

## EVERY SESSION — START (do this first, in order)
1. Read `HANDOVER.md` (current state). Do NOT re-read the whole repo.
2. Open `docs/BUILD_PLAN.md`, find the task named in HANDOVER "Next task". Read only that task.
3. Read only the files that task lists. Need more context? Read the specific file, not folders.
4. Say in 2 lines: which task, what you will change.

## WORK RULES
- ONE task at a time (task IDs like T-3.2). Do not start the next task until the current one passes its tests.
- Write/update tests FIRST for logic (fifo, stats, money). Then code. Then run tests.
- Money = integer paise. Quantity = integer base units (g, ml, pcs). NEVER use floats for money/qty.
- Never hard-code secrets (Neon URL, PIN, API keys). Use placeholder `DATABASE_URL`; app reads from secure storage.
- Never read/print: node_modules, src-tauri/target, dist, package-lock.json, *.db, .env.
- Small diffs. Edit existing files; do not rewrite whole files unless asked.
- Do not add new libraries without writing the reason in `docs/DECISIONS.md`.
- If a command fails twice the same way, STOP and write the error into HANDOVER "Blockers".

## Commands
- Dev app: `npm run tauri dev`
- Tests (quiet, saves tokens): `npx vitest run --reporter=dot`
- One test file: `npx vitest run src/logic/fifo.test.ts --reporter=dot`
- Types: `npx tsc --noEmit`
- DB push (dev branch only): `npx drizzle-kit push`

## DEFINITION OF DONE (per task)
- Acceptance criteria in BUILD_PLAN met
- `npx tsc --noEmit` clean, tests green
- Checkbox ticked in `docs/BUILD_PLAN.md`
- `HANDOVER.md` updated
- git commit: `T-x.y: <short summary>`

## HANDOVER — when to write it (MANDATORY)
Update `HANDOVER.md` (use its template, keep under 60 lines) when ANY of these happen:
- a task is finished
- context/tokens feel ~70% used, or the tool warns about context/limits
- you are stuck / blocked
- every ~30 minutes of work
Then commit: `wip: T-x.y handover`. Write it BEFORE you run out — a half-written handover is worse than none.

## Where things are
- Spec & data model: `docs/BLUEPRINT.md`
- Tasks & acceptance criteria: `docs/BUILD_PLAN.md`
- Test cases: `docs/TESTING.md`
- Setup/installs: `docs/SETUP.md`
- Decisions log: `docs/DECISIONS.md`
- Token-saving rules: `docs/TOKEN_SAVING.md`
