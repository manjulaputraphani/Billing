# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 00:40 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
**Login workstream approved** (docs/PLAN_LOGIN.md) — NOT built yet. PIN login still works for now.
Next: **L4 login screen** (phone+password, first-run owner, retire PIN). L1–L3 DONE; L5 plumbing done.

## Approved decisions (2026-10-31)
- Login: type **phone + password** (min 6 chars, argon2id hash in DB).
- Roles stored `owner|staff`; permission limits NOT enforced yet.
- First run after the update → create Owner account, then PIN removed.
- Audit: every write records user id + name in `activity_log`.

## Status
- [x] Billing / Bills / GST invoice / email / company settings migrated
- [x] `sdhhe_fy2025` backed up + dropped; company details now in `settings`
- [x] L1 schema · [x] L2 crypto · [x] L3 auth rules · [~] L5 plumbing · [ ] L4/L6
- [ ] Profit report + dashboard cards · charts · V2-P11 credit · Funds

## Done recently
- Bills `SD-2026-000001…4` verified in Neon; cancel restores exact batches; 6-line bill tested.
- Invoice design matches the SDHHE sample (HSN, GSTIN, bank, terms, words, watermark).
- GSTIN validation + portal assist + auto-fill; bill email via lettre (Gmail app password in Keychain).
- Company data copied from legacy schema; backup at ~/Documents/stock-tracker-backups/.
- Tests: 203 passed / 36 files · tsc clean · cargo check clean.

## Next exact step
1. L1: add `app_users` + `activity_log.user_id` to schema.ts, additive SQL to the current DB.
2. L2: Rust `hash_password`/`verify_password` (argon2id; keep `hash_pin`/`verify_pin` until L4 retires them).
3. L4 (next session, ONE task): rewrite `Lock.tsx` → phone+password login (uses `normalizePhone`,
   `validatePassword`, `hashPassword/verifyPassword`, `app_users`), first-run owner setup when
   `app_users` is empty, `setAuditActor` on success, clear on lock, delete `PIN_HASH` after first owner
   login. App phases: setup(connection only) → login → home.
4. L6 (same session or next): Settings → Users (owner): add/reset/deactivate; user filter on activity.
5. Test surface to update in L4: src/App.test.tsx (PIN → login), src/pages/Setup.test.tsx (DB only),
   e2e/app.spec.ts (stub app_users + login; remove PIN expectations).

## Notes / blockers
- ⚠ No DATABASE_URL_TEST (dev branch); migrations applied additively to the live DB.
- **tablesFilter guard still TODO** — `drizzle-kit push` could propose dropping the other app's 34 tables.
- Legacy empty `sales` table still present (drop later).
- Test data: TEST items 3–8 + test bills; cleanup on request.
- Keychain: DATABASE_URL allow-all; SMTP_PASSWORD NOT set (user must create a Gmail app password).
