import { useState, type FormEvent } from "react";
import { pingDb } from "../db/client";
import { hashPin, saveSecret, SECRET_KEYS } from "../lib/secrets";
import { hostLabel } from "../lib/url";

const PIN_RE = /^\d{4,6}$/;

export default function Setup({ onDone }: { onDone: () => void }) {
  const [url, setUrl] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function testConnection() {
    setError(null);
    setStatus(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a connection string first");
      return;
    }
    setBusy(true);
    try {
      await pingDb(trimmed);
      // Only ever echo the host — never the full string.
      setStatus(`Connected to ${hostLabel(trimmed)}`);
    } catch {
      setError("Cannot connect - check the connection string");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a connection string");
      return;
    }
    if (!PIN_RE.test(pin)) {
      setError("PIN must be 4-6 digits");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    setBusy(true);
    try {
      await saveSecret(SECRET_KEYS.DATABASE_URL, trimmed);
      await saveSecret(SECRET_KEYS.PIN_HASH, await hashPin(pin));
      onDone();
    } catch (err) {
      setError(`Could not save: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f6f4] p-6">
      <div className="card w-full max-w-md p-6">
      <header className="mb-6 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-semibold text-white">
          ST
        </span>
        <span className="space-y-0.5">
          <h1 className="text-lg font-semibold tracking-tight">Set up Stock Tracker</h1>
          <p className="text-sm text-gray-500">
            Connect your Neon database and choose a PIN. Both are stored in this computer's secure
            storage.
          </p>
        </span>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="label" htmlFor="db-url">
            Neon connection string
          </label>
          <input
            id="db-url"
            type="password"
            autoComplete="off"
            spellCheck={false}
            className="input w-full font-mono text-sm"
            placeholder="postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require"
            value={url}
            onChange={(e) => setUrl(e.currentTarget.value)}
          />
          <button
            type="button"
            className="btn-ghost disabled:opacity-50"
            onClick={testConnection}
            disabled={busy}
          >
            Test connection
          </button>
        </div>

        <div className="space-y-1">
          <label className="label" htmlFor="pin">
            PIN
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            className="input w-full"
            placeholder="4-6 digits"
            value={pin}
            onChange={(e) => setPin(e.currentTarget.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="label" htmlFor="confirm-pin">
            Confirm PIN
          </label>
          <input
            id="confirm-pin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            className="input w-full"
            placeholder="Repeat PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.currentTarget.value)}
          />
        </div>

        {error && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {status && !error && (
          <p role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
            {status}
          </p>
        )}

        <button
          type="submit"
          className="w-full btn-primary"
          disabled={busy}
        >
          Save & continue
        </button>
      </form>
      </div>
    </main>
  );
}
