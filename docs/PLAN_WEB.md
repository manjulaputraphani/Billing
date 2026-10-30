# WEB EDITION (Cloudflare) — plan

A browser version of the same app, same Neon data, same invoice design. The Tauri desktop app
stays as-is. Nothing here is built yet.

## Architecture
```
Browser ── Cloudflare Pages (Vite/React, free)
                │  /api/*
                ▼
        Cloudflare Worker (free 100k req/day)
          · DATABASE_URL secret (never reaches the browser)
          · login: phone + password (app_users), signed session token
          · reuses src/db/*.ts + drizzle + schema (Neon HTTP driver works on Workers)
          · audit: same activity_log with actor from the session
          · email: Resend API (Workers cannot use raw SMTP)
                ▼
        Neon Postgres (existing, free tier)
```

## Key decisions / constraints
- **Never expose the Neon URL** in the web bundle — only the Worker holds it.
- **Password hashing**: existing hashes are argon2id (`$argon2id$...` from Rust). Worker verifies them
  with `hash-wasm` (WASM argon2id, works in Workers) so desktop and web share one `app_users` table.
- **Sessions**: signed JWT in an HttpOnly cookie; logout clears it. 5-attempt rate limit per phone.
- **Reuse**: schema, `src/logic/*` (auth, gst, profit, sales plan), `src/db/*` functions, invoice HTML.
- **Replace**: Tauri keychain/opener/print/updater with web equivalents behind `lib/platform.ts`.
- **Free tiers**: Pages static (free), Workers 100k/day, Neon 0.5 GB, Resend 100 emails/day.

## Workstream (one step per session)
- **W1 Worker scaffold** — `web-worker/` (wrangler.toml, plain fetch router), `/api/health`,
  DATABASE_URL secret, local dev with `wrangler dev`.
- **W2 Auth API** — `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`; verify argon2
  via hash-wasm; HttpOnly cookie; rate limit; set audit actor from session.
- **W3 API port** — endpoints for items, purchases, stock, sales/bills, customers, expenses, settings,
  users, activity; reuse the existing db modules; server-side actor for audit.
- **W4 Web UI** — `web/` Vite app importing the same pages; `lib/platform.ts` (web: fetch API, window.open,
  browser print); strip Tauri imports; responsive sidebar; Pages deploy.
- **W5 Email** — Resend API in the Worker (sender = shop address, HTML invoice from `buildBillHtml`);
  Settings email card adapted; `bill.email` audit.
- **W6 Hardening + e2e** — cookies/CSRF, rate limits, Playwright against Pages preview + worker;
  custom domain (optional).

## What I need from the user
1. A **Cloudflare account** (free). Deployment either via `wrangler login` on this Mac or an API token.
2. Optional: a **domain** for Resend email (web email can be skipped initially).
3. Confirm the web login uses the **same phone+password members** as the desktop (recommended).

## Not in scope
- Offline web mode, auto-updates for web (Pages deploys instantly), mobile store apps.
- The desktop app continues to be the primary billing app until the web edition reaches feature parity.
