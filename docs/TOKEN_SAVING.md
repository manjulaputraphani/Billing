# TOKEN SAVING — for Claude Code, OpenCode and Ollama Cloud limits

## Rules for the agent
1. Read HANDOVER.md + ONE task, not the whole repo. Never `ls -R` or read folders recursively.
2. Never open: node_modules, src-tauri/target, dist, package-lock.json, *.lock, *.db, images.
3. Read only the lines needed (use search/grep for a function name, then read that range).
4. Make small edits (find/replace) instead of rewriting whole files.
5. Run tests quietly: `npx vitest run --reporter=dot`; one file at a time while working.
6. On errors, show only the first error + 5 lines, not full logs. `npm run tauri build 2>&1 | tail -30`.
7. Don't explain code unless asked. Reply: what changed, test result, next step.
8. Don't re-read a file you just wrote.

## Rules for you (the human)
- One task = one session. After finishing: commit, then start a NEW session.
- Before context fills: ask "update HANDOVER.md and commit" (prompts/END_SESSION.md).
- Use a cheap/fast model (GLM 5.3 Flash) for UI, CRUD, tests. Strong model only for hard tasks.
- Paste only the error line + file name, not screenshots or whole logs.
- Point to files by path ("see src/logic/fifo.ts") instead of pasting code.

## Claude Code commands
- `/clear` — fresh context between tasks (HANDOVER keeps the memory)
- `/compact` — summarize when long; add focus: `/compact keep task T-4.1 details`
- `/context` — see what's using context
- `.claude/settings.json` (in kit) blocks reading heavy folders

## OpenCode commands
- `/new` — new session per task
- `/compact` — summarize current session
- `/undo` — revert last change instead of asking the model to "fix it back"
- `opencode.json` (in kit) points to the Ollama model

## Ollama Cloud
- Usage limits apply per plan. Batch questions; avoid "rewrite the whole app".
- If limit hit: work stops → HANDOVER is already there (written at ~70%) → continue later or switch model with prompts/RECOVER.md.
