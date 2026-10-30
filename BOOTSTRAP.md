# BOOTSTRAP.md — OpenCode: run this to set up the project (tasks T-0.1 → T-0.4)

You (the AI agent) are inside the kit folder (it contains AGENTS.md, HANDOVER.md, docs/, prompts/).
Follow the steps IN ORDER. Run each command, check the result, then continue.
Rules: do NOT run `npm run tauri dev` (it never exits — the human will run it). Do NOT read node_modules or src-tauri/target.
If a step fails twice, STOP, write the error in HANDOVER.md "Blockers" and tell the human.

First detect the OS: if Windows use the **PowerShell** commands, otherwise use the **bash** commands.

---

## STEP 1 — Check tools (T-0.1)
```
node -v
npm -v
rustc --version
cargo --version
git --version
ollama -v
```
Expected: Node 20 or higher; every command prints a version.
If any is missing → STOP and tell the human which one to install (see docs/SETUP.md). Do not try to install system tools yourself.

## STEP 2 — Create the Tauri app in a temp folder (T-0.2)
```
npm create tauri-app@latest app-tmp -- --template react-ts --manager npm --yes
```
If `--yes` is not accepted, run without it; if it asks questions choose: TypeScript/JavaScript → npm → React → TypeScript, project name `app-tmp`.

## STEP 3 — Move app files into this folder (keep kit files)
PowerShell:
```
Get-ChildItem -Path app-tmp -Force | Where-Object { $_.Name -ne ".gitignore" -and $_.Name -ne "README.md" } | Move-Item -Destination . -Force
Get-Content app-tmp\.gitignore -ErrorAction SilentlyContinue | Add-Content .gitignore
Remove-Item app-tmp -Recurse -Force
```
bash:
```
shopt -s dotglob
for f in app-tmp/*; do n=$(basename "$f"); [ "$n" = ".gitignore" ] || [ "$n" = "README.md" ] || mv -f "$f" .; done
cat app-tmp/.gitignore >> .gitignore 2>/dev/null; rm -rf app-tmp
```
Check: `package.json`, `src/`, `src-tauri/`, `AGENTS.md`, `docs/` all exist in this folder.

## STEP 4 — Rename the app
In `package.json` set `"name": "stock-tracker"`.
In `src-tauri/tauri.conf.json` set `"productName": "Stock Tracker"` and `"identifier": "com.stocktracker.app"`.
In `src-tauri/Cargo.toml` set `name = "stock-tracker"` under [package] (keep the `[lib]` name as generated).

## STEP 5 — Install base dependencies
```
npm install
```

## STEP 6 — Install project libraries (T-0.3)
```
npm install drizzle-orm @neondatabase/serverless zod recharts xlsx jspdf react-router-dom
npm install -D drizzle-kit vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom tailwindcss @tailwindcss/vite dotenv
```

## STEP 7 — Add scripts to package.json
Add inside "scripts" (keep existing ones):
```
"test": "vitest run --reporter=dot",
"test:watch": "vitest",
"typecheck": "tsc --noEmit",
"db:push": "drizzle-kit push"
```

## STEP 8 — Configure Tailwind + Vitest
Edit `vite.config.ts`: import `tailwindcss from "@tailwindcss/vite"` and add `tailwindcss()` to `plugins` (keep the existing react plugin and Tauri settings). Add:
```
test: { environment: "jsdom", globals: true, setupFiles: ["./src/test/setup.ts"] },
```
Add `/// <reference types="vitest/config" />` as the first line of vite.config.ts.
Create `src/test/setup.ts`:
```
import "@testing-library/jest-dom";
```
Replace the content of `src/App.css` with:
```
@import "tailwindcss";
```
Create a smoke test `src/test/smoke.test.ts`:
```
import { describe, it, expect } from "vitest";
describe("smoke", () => { it("works", () => { expect(1 + 1).toBe(2); }); });
```

## STEP 9 — Create folders for later tasks
Create empty folders with a `.gitkeep` file: `src/db`, `src/logic`, `src/pages`, `src/components`, `src/ai`.

## STEP 10 — Create .env template (no secrets)
Create `.env.example`:
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```
Confirm `.env` is listed in `.gitignore`. Never create a real `.env` yourself — the human pastes the Neon URL.

## STEP 11 — Verify
```
npm test
npm run typecheck
npm run build
```
Expected: smoke test passes, no type errors, Vite build succeeds.
(Optional slow check of Rust side: `cd src-tauri && cargo check && cd ..` — takes several minutes the first time.)

## STEP 12 — Git (T-0.4)
```
git init
git add -A
git commit -m "T-0.1 to T-0.3: Tauri React TS project + kit + test setup"
```
(If git asks for user name/email, tell the human to run:
`git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`.)

## STEP 13 — Update tracking files
- In `docs/BUILD_PLAN.md` tick: T-0.1, T-0.2, T-0.3, and T-0.4 (local git done; GitHub push is for the human).
- Rewrite `HANDOVER.md` using its template:
  - Current task: T-0.5 Neon (needs the human)
  - Done: steps above, test result
  - Next exact step: "Human: create Neon project (Singapore) + `dev` branch, paste dev URL into `.env` as DATABASE_URL. Then agent starts T-1.1."
- Commit: `git add -A && git commit -m "handover: bootstrap done"`

## STEP 14 — Tell the human (short reply)
1. Run `npm run tauri dev` once to see the empty app window (first run 5–10 min).
2. Create Neon project + `dev` branch, copy `.env.example` to `.env`, paste the dev URL.
3. Optional: create a private GitHub repo and run `git remote add origin <url>` then `git push -u origin main` (or `master`).
4. Then start a NEW session and paste `prompts/START_SESSION.md` to begin T-1.1.
