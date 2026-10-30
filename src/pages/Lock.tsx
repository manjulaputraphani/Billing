import { useEffect, useState, type FormEvent } from "react";
import { getSecret, SECRET_KEYS, verifyPin } from "../lib/secrets";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

export default function Lock({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  const isLocked = lockedUntil !== null && now < lockedUntil;
  const secondsLeft = isLocked ? Math.ceil((lockedUntil - now) / 1000) : 0;

  // Tick the countdown while locked, and clear the lock when it expires.
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLocked || busy) return;
    setError(null);
    setBusy(true);
    try {
      const hash = await getSecret(SECRET_KEYS.PIN_HASH);
      if (!hash) {
        setError("No PIN is saved on this computer. Reset the connection to start again.");
        return;
      }
      const ok = await verifyPin(pin, hash);
      if (ok) {
        onUnlock();
        return;
      }
      const next = attempts + 1;
      setAttempts(next);
      setPin("");
      if (next >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCK_MS;
        setNow(Date.now());
        setLockedUntil(until);
      } else {
        setError(`Wrong PIN. ${MAX_ATTEMPTS - next} attempt(s) left.`);
      }
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
          <p className="text-sm text-gray-500">Enter your PIN to unlock.</p>
        </span>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="label" htmlFor="unlock-pin">
            PIN
          </label>
          <input
            id="unlock-pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            autoFocus
            className="input w-full"
            placeholder="4-6 digits"
            value={pin}
            disabled={isLocked}
            onChange={(e) => setPin(e.currentTarget.value)}
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

        <button
          type="submit"
          className="w-full btn-primary"
          disabled={isLocked || busy}
        >
          Unlock
        </button>
      </form>
      </div>
    </main>
  );
}
