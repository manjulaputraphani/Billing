import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getDb } from "../db/client";
import { countUsers, createUser, findUserByPhone, type AppUser } from "../db/users";
import { logActivity, setAuditActor } from "../db/activity";
import { deleteSecret, SECRET_KEYS, verifyPassword } from "../lib/secrets";
import { normalizePhone } from "../logic/auth";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

type Props = { url: string; onLogin: (user: AppUser) => void };

export default function Lock({ url, onLogin }: Props) {
  const db = useMemo(() => getDb(url), [url]);
  const [firstRun, setFirstRun] = useState<boolean | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const isLocked = lockedUntil !== null && now < lockedUntil;
  const secondsLeft = isLocked ? Math.ceil((lockedUntil - now) / 1000) : 0;

  useEffect(() => {
    countUsers(db)
      .then((count) => setFirstRun(count === 0))
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setFirstRun(false);
      });
  }, [db]);

  useEffect(() => {
    if (lockedUntil === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockedUntil) {
        setLockedUntil(null);
        setAttempts(0);
        setError(null);
      }
    }, 250);
    return () => clearInterval(id);
  }, [lockedUntil]);

  async function finishLogin(user: AppUser) {
    setAuditActor({ userId: user.id, name: user.name, role: user.role });
    try {
      await logActivity(db, { event: "login", summary: `${user.name} signed in` });
    } catch {
      // logging must never block sign-in
    }
    // The PIN is retired once member login works.
    try {
      await deleteSecret(SECRET_KEYS.PIN_HASH);
    } catch {
      // already gone is fine
    }
    onLogin(user);
  }

  async function createOwner(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const owner = await createUser(db, { name, phone, password, role: "owner" });
      await finishLogin(owner);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function signIn(e: FormEvent) {
    e.preventDefault();
    if (isLocked || busy) return;
    setError(null);
    const check = normalizePhone(phone);
    if (!check.valid) {
      setError(check.reason ?? "Enter a valid phone number");
      return;
    }
    setBusy(true);
    try {
      const user = await findUserByPhone(db, check.phone);
      if (!user) {
        setError("No account found for this number");
        return;
      }
      if (!user.active) {
        setError("This account is disabled — ask the owner");
        return;
      }
      if (!(await verifyPassword(password, user.passwordHash))) {
        const next = attempts + 1;
        setAttempts(next);
        setPassword("");
        if (next >= MAX_ATTEMPTS) {
          setNow(Date.now());
          setLockedUntil(Date.now() + LOCK_MS);
        } else {
          setError(`Wrong password. ${MAX_ATTEMPTS - next} attempt(s) left.`);
        }
        return;
      }
      setAttempts(0);
      await finishLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f6f4] p-6">
      <div className="card w-full max-w-sm p-6">
        <header className="mb-6 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-semibold text-white">
            ST
          </span>
          <span className="space-y-0.5">
            <h1 className="text-lg font-semibold tracking-tight">Stock Tracker</h1>
            <p className="text-sm text-gray-500">
              {firstRun === null
                ? "Loading…"
                : firstRun
                  ? "First run — create the owner account."
                  : "Sign in with your phone number and password."}
            </p>
          </span>
        </header>

        {firstRun === null ? null : firstRun ? (
          <form className="space-y-4" onSubmit={createOwner} data-testid="owner-form">
            <div className="space-y-1">
              <label className="label" htmlFor="owner-name">
                Your name
              </label>
              <input
                id="owner-name"
                className="input w-full"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="label" htmlFor="owner-phone">
                Phone number
              </label>
              <input
                id="owner-phone"
                className="input w-full"
                inputMode="numeric"
                placeholder="10 digits"
                value={phone}
                onChange={(e) => setPhone(e.currentTarget.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="label" htmlFor="owner-password">
                Password
              </label>
              <input
                id="owner-password"
                type="password"
                autoComplete="new-password"
                className="input w-full"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="label" htmlFor="owner-confirm">
                Confirm password
              </label>
              <input
                id="owner-confirm"
                type="password"
                autoComplete="new-password"
                className="input w-full"
                value={confirm}
                onChange={(e) => setConfirm(e.currentTarget.value)}
              />
            </div>
            {error && (
              <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              Create owner
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={signIn} data-testid="login-form">
            <div className="space-y-1">
              <label className="label" htmlFor="login-phone">
                Phone number
              </label>
              <input
                id="login-phone"
                className="input w-full"
                inputMode="numeric"
                placeholder="10 digits"
                autoFocus
                value={phone}
                disabled={isLocked}
                onChange={(e) => setPhone(e.currentTarget.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className="input w-full"
                value={password}
                disabled={isLocked}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
            </div>

            {isLocked ? (
              <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                Too many wrong attempts. Try again in {secondsLeft}s.
              </p>
            ) : (
              error && (
                <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )
            )}

            <button type="submit" className="btn-primary w-full" disabled={isLocked || busy}>
              Sign in
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
