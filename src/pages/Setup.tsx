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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Set up Stock Tracker</h1>
        <p className="text-sm text-gray-500">
          Connect your Neon database and choose a PIN. Both are stored in this computer's secure
          storage.
        </p>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="db-url">
            Neon connection string
          </label>
          <input
            id="db-url"
            type="password"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm"
            placeholder="postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require"
            value={url}
            onChange={(e) => setUrl(e.currentTarget.value)}
          />
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
            onClick={testConnection}
            disabled={busy}
          >
            Test connection
          </button>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="pin">
            PIN
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            className="w-full rounded border border-gray-300 px-3 py-2"
            placeholder="4-6 digits"
            value={pin}
            onChange={(e) => setPin(e.currentTarget.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="confirm-pin">
            Confirm PIN
          </label>
          <input
            id="confirm-pin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            className="w-full rounded border border-gray-300 px-3 py-2"
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
          className="w-full rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={busy}
        >
          Save & continue
        </button>
      </form>
    </main>
  );
}
