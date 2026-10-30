# HANDOVER (keep under 60 lines — overwrite each time, history is in git)

Last updated: 2026-10-31 00:20 by DeepSeek V4.1 Flash (OpenCode)
Tool: OpenCode

## Current task
**Billing, Bills, GST invoice, and bill email are done.** Next: user configures Gmail app password and
sends a real test email; then Profit report + Dashboard cards, charts plan, V2-P11.

## Status
- [x] GST Billing + printable/viewable SDHHE-style invoice (HSN, GSTIN, bank, terms, words)
- [x] Bills list (issued/cancelled, view, print, cancel with exact stock restore)
- [x] GSTIN validation + portal assist + saved-customer auto-fill
- [x] Bill email (Gmail SMTP via lettre, HTML invoice, Keychain app password)
- [ ] Profit report + dashboard cards · charts · V2-P11 credit · Funds tab

## Done (2026-10-31)
- Billing: SD-2026-000001 (cancelled test), -000002 (KALKI), -000003 (6-line test, ₹987),
  -000004 (GSTIN 37JAGPM1479E1ZE valid, ₹231). All bills + lines + SALE movements verified in Neon.
- Invoice layout matches the SDHHE sample; mixed-unit + per-line CGST/SGST fixed.
- Email: Settings → Email card (from address/name, smtp.gmail.com:465, app password → Keychain,
  Send test email). Customer email field on billing; Bills → View → Email bill (HTML invoice,
  audit `bill.email`). Rust `send_email` (lettre/rustls).

## Next exact step (one action next session does first)
1. User: Gmail 2FA → App Passwords → Settings → Email: from address + 16-char password → Send test.
2. Then bill a customer with their email → Bills → View → Email bill.

## Tests
- `npm test` → 203 passed (36 files) · `npx tsc --noEmit` clean · `cargo check` clean
- Email HTML uses `buildBillHtml` (same design as print)

## Notes / blockers
- ⚠ No DATABASE_URL_TEST (dev branch) → int tests skipped; migrations applied additively to the live DB.
- Test data present: TEST items 3–8, test bills. Cleanup on request.
- Bill number stays SD-YYYY-NNNNNN; logo is a monogram (send logo file to embed).
- Keychain items allow-all on this Mac; `ollama` not installed.
