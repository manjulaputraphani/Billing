# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 13:10 by MiniMax M3.1 Flash (OpenCode)
Tool: OpenCode

## Current state
Both editions share the **coffee-café theme (light + dark)**.
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.

## Live / deployment
- Worker `sdhhe-api`: static assets from `web/dist` + API. Deploy: `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy` (wrangler 4.86 works on Node 20 here).
- Secrets set: `DATABASE_URL`, `SESSION_SECRET`. Optional email: `RESEND_API_KEY` / `MAIL_FROM`;
  a key can also be saved AES-GCM encrypted in settings (`resend_api_key_enc`) via Settings.
- DB: Neon `SriDurgaHariHaraEnterprises` (shared with desktop). Members: owner **B PHANI KUMAR**
  (7569208757), staff **Chaluvaraj** (9019744242).

## Theme (done 2026-10-31)
- Palette = CSS variables → `<html data-theme="light|dark">`, mapped into Tailwind v4 with
  `@theme inline` (`bg-surface`, `text-ink`, `border-line`, `bg-primary`, …). Web: `web/src/styles.css`
  · desktop: `src/App.css` (same tokens, same rules).
- Light: cream `#F7F1E8` page, `#FFFFFF` cards, brown `#6F4E37` primary, gold `#C8963E`, sage
  `#7A8B5A`. Dark: `#1C1612` page, `#2A211B` cards, latte `#C8A27C`, `#E0B060`, `#9DB07A`.
- Shared engine: `src/lib/theme.ts` + `src/components/ThemeToggle.tsx` (web re-exports them).
  Modes light/dark/system, localStorage `sdhhe-theme`, inline pre-paint script in `index.html`
  (no flash), live `prefers-color-scheme` following, 200 ms cross-fade. Toggle: desktop side rail
  + Lock/Setup screens; web sidebar, mobile header, login card. Playfair Display + Inter (CDN).
- Tests: `src/lib/theme.test.ts` (5) · Playwright checked light/dark at 1280 px and 390 px.

## Web features done
Login · self-signup → owner approval + role · Invoices + GST bill view · New Bill · Items add/edit +
owner-only delete · Purchases · Stock Check · Expenses · Dashboard · Investments · Activity ·
Settings (email/Resend key) · responsive · icon pill buttons.
Desktop (Tauri): phone+password login, setup, billing + SDHHE invoice, bill cancel with exact stock
restore, audit attribution, expenses + bill photos, Gmail SMTP (needs app password). PIN retired.

## Next tasks (priority)
1. **Enable email**: Resend key + MAIL_FROM (Settings or `wrangler secret put`) → Send test; desktop
   Gmail app password → Send test.
2. **Rotate the owner password** (short/exposed) via Team → Reset password.
3. Save the Playwright suites into the repo (`web/tests/`) — they currently live only in TMPDIR.
4. Fix the PRE-EXISTING tsc errors (handover used to say "tsc clean", it is not): `src/db/users.ts`
   `createAppUser().returning()` misses `pending` → add `pending: appUsers.pending`; same in the
   fixtures of `src/App.test.tsx`, `src/pages/Lock.test.tsx`, `src/pages/Settings.test.tsx`.
5. `tablesFilter` guard in drizzle.config; drop the empty interim `sales` table; optionally remove
   TEST items/bills/audit rows.
6. Optional: desktop analytics (docs/PLAN_ANALYTICS.md — `/reports` is still ComingSoon), V2-P12
   pack units / WhatsApp share, V2-P14 barcode, V2-P16 multi-location + accountant export.
## Commands
- Web local: `cd web-worker && ./node_modules/.bin/wrangler dev` (:8787 serves web/dist + API) or
  `cd web && npm run dev` (:5173, /api proxied) · `cd web && npm run typecheck`
- Desktop: `npm run tauri dev` · Tests: `npx vitest run --reporter=dot` (217 green) ·
  `npx tsc --noEmit` (8 pre-existing errors, see task 4) · e2e skipped (no DATABASE_URL_TEST)

## Blockers / notes
- No `DATABASE_URL_TEST` → integration + Playwright suites skipped; schema changes applied additively
  to the live DB.
- Workers cannot use Gmail SMTP (web uses Resend); desktop keeps Gmail SMTP.
- Passwords were pasted in an earlier chat — treat as exposed; rotate.
