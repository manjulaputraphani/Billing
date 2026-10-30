# Stock Tracker — AI build kit

Files the AI agent follows to build the app step by step, with handover so work never gets lost.

| File | Purpose |
|---|---|
| AGENTS.md | Master rules (OpenCode reads it; Claude Code via CLAUDE.md) |
| CLAUDE.md | Points Claude Code to AGENTS.md |
| HANDOVER.md | Current state — updated every task / before tokens run out |
| docs/BLUEPRINT.md | Spec, data model, FIFO logic, worked example |
| docs/BUILD_PLAN.md | All tasks T-0.1 … T-9.1 with acceptance criteria |
| docs/TESTING.md | Every test case |
| docs/SETUP.md | What to install, Neon, Ollama, OpenCode, Claude Code |
| docs/TOKEN_SAVING.md | Token-saving rules + commands |
| docs/DECISIONS.md | Why choices were made |
| prompts/*.md | Copy-paste prompts: start, end, recover, task |
| opencode.json | OpenCode → Ollama GLM config |
| .claude/settings.json | Stops Claude Code reading heavy/secret files |

## How to use
1. Do docs/SETUP.md (T-0.1).
2. `npm create tauri-app@latest stock-tracker`, then copy ALL kit files into that folder (T-0.2).
3. Open OpenCode or Claude Code in the folder, paste prompts/START_SESSION.md.
4. One task per session. When context ~70% or stopping: paste prompts/END_SESSION.md.
5. Session died suddenly? New session → paste prompts/RECOVER.md.
6. Switching tool (OpenCode ⇄ Claude Code) or model: same START prompt — HANDOVER.md carries the state.
