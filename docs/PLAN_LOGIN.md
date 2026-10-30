# LOGIN & USERS — approved plan (2026-10-31)

Replaces the single PIN with member accounts (4 members) and per-user audit.

## Approved decisions
- **Login:** type **phone number + password** (no member list shown).
- **Password:** minimum **6 characters**, stored only as an **argon2id hash**.
- **Roles:** stored as `owner | staff`; permission limits are **not enforced yet** (later).
- **Existing PIN:** on the first launch after the update, if no members exist → **Create owner account**
  (name, phone, password), then the old PIN is removed. Until that build ships, the PIN keeps working.
- **Audit:** every write records the logged-in user (id + name snapshot) in `activity_log`.

## Data model (all in `public`, prefixed to avoid the other app's `Users`)
```
app_users(id, name, phone unique, password_hash, role owner|staff, active, created_at)
activity_log: add user_id (FK app_users, nullable), keep actor text (name snapshot)
```
Phone normalized to 10 digits (`9876543210`); uniqueness enforced.

## Flows
1. Start → read DB URL from Keychain → **Login**: phone + password.
2. Correct → session starts, audit `login` with user. Wrong ×5 → 60s cooldown (per phone).
3. Lock now / Logout → login screen, audit `lock` with user.
4. First run (no members) → Create owner → audit `owner.create`.
5. DB unreachable → clear error (“can’t reach the database”) — login now needs the DB.
6. Settings → Users (Owner): list, add, reset password, deactivate (audit rows stay).
7. Settings → Recent activity: filter by user.

## Security notes
- Accounts/hashes live in Neon (shared across laptops); DB URL stays in the Keychain.
- App-level auth only — the DB credentials on the machine can bypass the UI. Fine for family/staff.

## Delivery order (one step per commit, tests first)
1. **L1 Schema** — `app_users` + `activity_log.user_id`; additive migration.
2. **L2 Crypto** — Rust `hash_password` / `verify_password` (argon2id; keep the PIN commands until retired).
3. **L3 Logic** — phone normalization + password rules (pure, tests): 10-digit phone, min 6.
4. **L4 Login UI** — phone + password, attempts/cooldown, first-run owner setup, lock/logout; retire PIN
   after the first successful owner login (delete `PIN_HASH`).
5. **L5 Audit attribution** — thread the session user through every write path + user filter in Settings.
6. **L6 Team screen** — add/reset/deactivate members (Owner only) + tests/e2e.
