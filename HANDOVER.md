# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 06:20 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current state
Desktop app is complete for daily use; **web edition is LIVE**:
https://sdhhe-api.blvphani.workers.dev  (one Cloudflare Worker = UI + /api)

## Live / deployment
- Worker `sdhhe-api`: static assets from `web/dist` (`[assets] binding=ASSETS, run_worker_first`)
  + API. Deploy: `cd web && npm run build` → `cd ../web-worker && npx wrangler@3 deploy`.
- Secrets set: `DATABASE_URL`, `SESSION_SECRET`. Optional email: `RESEND_API_KEY` / `MAIL_FROM`;
  a key can also be saved **AES-GCM encrypted in settings** (`resend_api_key_enc`) via Settings.
- DB: Neon `SriDurgaHariHaraEnterprices` (shared with desktop). Members: owner **B PHANI KUMAR**
  (7569208757), staff **Chaluvaraj** (9019744242).

## Web features done
Login · self-signup → owner approval + role (staff/owner) · Invoices + GST bill view · New Bill ·
Items add/edit + owner-only delete · Purchases · Stock Check · Expenses · Dashboard (cards, 14-day
sales/expense bars, expense donut) · Investments (owner) · Activity timeline + member filter ·
Settings (notify emails/toggles/Resend key/test) · Vastu palette (cream/forest-green/gold/terracotta) ·
responsive (390/430/768 tested) · icon pill buttons.

## Desktop app
Tauri: phone+password login (L1–L6), setup connection-only, billing + SDHHE invoice, bill cancel with
exact stock restore, audit attribution, expenses + bill photos, Gmail SMTP (needs app password).
`npm test` 212 green, tsc clean. PIN retired.

## Notifications (N1–N5)
Owner emails on signup request, member add/approve/role, staff-created bill. Recipients/toggles stored;
sender = Resend (Workers cannot SMTP). **Nothing sends until a Resend key is configured.**

## Next tasks (priority)
1. **Enable email**: Resend key + MAIL_FROM (Settings or `wrangler secret put`) → Send test; desktop
   Gmail app password → Send test.
2. **Rotate the owner password** (short/exposed) via Team → Reset password.
3. Save Playwright suites into the repo (`web/tests/`) — they currently live only in TMPDIR.
4. `tablesFilter` guard in drizzle.config; drop the empty interim `sales` table; optionally remove
   TEST items/bills/audit rows.
5. Plans: docs/PLAN_ANALYTICS.md (charts/funds/investors), docs/PLAN_V2.md, Vastu palette on desktop.

## Commands
- Web local: `cd web-worker && npx wrangler@3 dev` (:8787) + `cd web && npm run dev` (:5173, /api proxied)
- Tests: `npx vitest run --reporter=dot` · `npx tsc --noEmit` · e2e skipped (no DATABASE_URL_TEST)
- Node 20 here; Wrangler 4 needs Node 22 (Wrangler 3 works today).

## Blockers / notes
- No `DATABASE_URL_TEST` → integration + Playwright suites skipped; schema changes applied additively
  to the live DB.
- Workers cannot use Gmail SMTP (web uses Resend); desktop keeps Gmail SMTP.
- Passwords were pasted in an earlier chat — treat as exposed; rotate.
- Test data left (optional cleanup): TEST items 3–8, bills SD-2026-000001…004, audit test rows.
