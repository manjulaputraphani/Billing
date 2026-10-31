# EMAIL SETTINGS & NOTIFICATIONS — plan (proposed 2026-10-31)

## Two mail paths (by design)
- **Desktop app** → Gmail SMTP (Settings → Email: from address, display name, host/port, app password
  in the Mac Keychain, Send test). Implemented; needs the Gmail **app password**.
- **Web (Cloudflare Worker)** → **cannot use SMTP** (Workers block raw SMTP). Uses **Resend HTTP API**:
  secrets `RESEND_API_KEY`, `MAIL_FROM`. Free 100 emails/day; `onboarding@resend.dev` only delivers
  to the account's own address until a domain is verified.
  A web Settings screen for SMTP is therefore not possible/honest — the web UI should show email
  status + notification recipients, not SMTP credentials.

## Notifications to the owners
Triggers:
1. **Account request (self-signup)** → email all owners: name, phone, “awaiting approval”.
2. **Member added / approved / role changed** → email owners.
3. **Bill created by a staff member** → email owners: bill no, customer, total, by whom.
4. Optional: password reset, member deactivated, daily summary.

Recipients:
- New setting `notify_emails` (comma-separated), default = shop email (`settings.shop_email`).
- Optional `app_users.email` per member (owners’ addresses) — migration if wanted; not required if
  `notify_emails` is used.

## Implementation steps (one per session)
- **N1** Settings keys `notify_emails` + per-event toggles (`notify_signup`, `notify_member`, `notify_bill`);
  read in the Worker; no UI yet.
- **N2** Notification sender helper in the Worker (Resend): `notifyOwners(subject, html)`; hook into
  signup + member add/approve/role; audit `notify.signup` / `notify.member`.
- **N3** Hook into bill creation: if the creating member is **staff**, notify owners with the bill
  details (bill no, lines count, total, member name).
- **N4** Web **Settings** screen (new tab): sender (MAIL_FROM), notify recipients, event toggles,
  “email configured” status + Send test (Resend); plus desktop Settings gets the same recipients.

## Requirements to go live
- Resend API key (free account) + `MAIL_FROM`.
- Owner notification email(s) (default `Manjulaputraphani@gmail.com` from shop settings).
- If using Gmail SMTP from desktop only, notifications fire only while the desktop app is running —
  the web Worker cannot use Gmail SMTP.
