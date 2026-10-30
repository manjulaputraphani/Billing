Use this when the previous session died suddenly (tokens/limit ran out) and HANDOVER.md may be outdated:

---
The last session stopped without a proper handover. Do this:
1. Read AGENTS.md and HANDOVER.md.
2. Run `git log --oneline -5` and `git status --short` and `git diff --stat` (do NOT print full diffs).
3. For changed files only, read the changed parts (`git diff <file>` for at most 3 files).
4. Run `npx vitest run --reporter=dot` and `npx tsc --noEmit`.
5. Rewrite HANDOVER.md with the real current state (what is done, half-done, failing).
6. Commit: `wip: recovered handover`. Then continue the task.
---
