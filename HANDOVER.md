# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-11-04 18:15 by GLM 5.3 (OpenCode)
Tool: OpenCode

## Current state
Web LIVE: https://sdhhe-api.blvphani.workers.dev · Desktop = Tauri app in `src/`.
Analytics + Web AI approved & committed by the owner on 2026-11-04.

## Done
- ⏳ **Analytics dashboard + Batch analysis (2026-11-04) — BUILT, TESTED, UNCOMMITTED, AWAITING OWNER
  APPROVAL — do NOT commit/push until the owner says "approved"**. New: `src/logic/analytics.ts` (all
  formulas; 19 tests incl. the exact sample scenario ▲2%/▲1%, ₹160, ₹50+₹69, 7kg, net=gross−50),
  `src/db/analytics.ts` (read-only SELECTs), `src/pages/Analytics.tsx` (period filter, 9 cards, 5 charts,
  low stock), `src/pages/Analysis.tsx` (batch table, expandable sale rows, totals), `components/Trend.tsx`
  (▲▼●). Modified: schema.ts (investments table DEF ONLY — table exists live, ZERO DB change), App.tsx
  routes `/analytics` + `/analysis` (Guarded: dashboard / reports modules), Layout sidebar (Money group).
  **281 tests green, tsc clean.** Assumptions logged in chat: sales=bills pre-GST; capital=investments
  (no withdrawals yet); avg stock = current value; Analysis date filter filters sales only.
- **T-10.5 + W7 WhatsApp bill + T-10.6 PDF bin (2026-11-04)**: desktop "WhatsApp bill" opens wa.me
  (logs bill.whatsapp; web Invoices button deployed live); Email bill sends PDF + auto-deletes on
  success; WhatsApp reveals PDF in Finder + "Delete PDF" chip; bin purges >24h on Bills load.
  Desktop rebuilt 7.43 MiB. Web email PDF pending (worker HTML-only).
- **Web email LIVE (2026-11-04)**: RESEND_API_KEY worker secret (machine wrangler OAuth; user's CF
  token has NO Workers perms). Delivers only to blvphani@gmail.com until a domain is verified → MAIL_FROM.
- **Restored SD-2026-000002** (2026-11-01): 30 Oct KALKI ₹7,875. **Open**: `000003`/`000004` (31 Oct,
  TEST customers) + `000001` (cancelled) — owner to confirm the real 31 Oct sale.
- **RBAC** (2026-10-31): permissions.ts 13 modules, role_permissions, 403 on every route; drizzle push
  still errors "activity_log already exists".

## Next tasks
1. Owner approves/rejects the analytics work → commit `T-11: analytics dashboard + batch analysis`
   (files listed above) → then: web edition screens (web-worker /api/analytics + web/src tabs),
   page-level UI tests for Analytics/Analysis, capital withdrawals (direction column, migration),
   true average stock value (daily snapshots).
1b. **Web AI (2026-11-04, UNCOMMITTED, deployed live)**: `POST /api/ai/chat` in web-worker
   (askAssistant + chat from src/ai, model glm-5.3-flash:cloud, key = OLLAMA_API_KEY worker secret,
   audit ai.chat) **+ "Ask AI" chat card on the web Dashboard** (api.ts aiChat helper, App.tsx state +
   askAi + section; tsc clean, deployed, verified in live bundle). **TODO: web Suggestions screen**
   (needs the stats pipeline in the worker). Ollama Cloud key is in chat history — rotate if ever shared.
2. Owner decision: SD-2026-000003/000004 real sales? Release questions (docs/RELEASE_PLAN.md).
3. Email finish: verify a domain in Resend → `wrangler secret put MAIL_FROM` → Send test via UI.
4. Windows identifier fix → tag v1.0.0; Android PWA + TWA APK; T-4/T-5; rotate owner password.

## Commands
- Tests: `npx vitest run --reporter=dot` (281) · `npx tsc --noEmit` · analytics only:
  `npx vitest run src/logic/analytics.test.ts` · Desktop: `npm run tauri dev`.
- Web: `cd web-worker && ./node_modules/.bin/wrangler dev` · deploy `cd web && npm run build` →
  `cd ../web-worker && ./node_modules/.bin/wrangler deploy`. Desktop build: `npm run tauri build`.

## Blockers
- Neon HTTP (fetch) flaky from this machine: retry 3–5× before trusting a failure.