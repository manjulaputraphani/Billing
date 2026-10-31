import { useState, type FormEvent } from "react";
import { pingDb } from "../db/client";
import { saveSecret, SECRET_KEYS } from "../lib/secrets";
import { hostLabel } from "../lib/url";
import CoffeeIcon from "../components/CoffeeIcon";
import ThemeToggle from "../components/ThemeToggle";

export default function Setup({ onDone }: { onDone: () => void }) {
  const [url, setUrl] = useState("");
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
    setBusy(true);
    try {
      await saveSecret(SECRET_KEYS.DATABASE_URL, trimmed);
      onDone();
    } catch (err) {
      setError(`Could not save: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="card w-full max-w-md p-6">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary">
              <CoffeeIcon />
            </span>
            <span className="space-y-0.5">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-muted">
                SREE DURGA HARIHARA ENTERPRISES
              </p>
              <h1 className="text-lg font-semibold tracking-tight">Set up Stock Tracker</h1>
              <p className="text-sm text-muted">
                Connect your Neon database. It is stored in this computer&apos;s secure storage; members
                sign in with their phone number and password.
              </p>
            </span>
          </div>
          <ThemeToggle />
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
              className="input w-full font-mono"
              placeholder="postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require"
              value={url}
              onChange={(e) => setUrl(e.currentTarget.value)}
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void testConnection()}
              disabled={busy}
            >
              Test connection
            </button>
          </div>

          {error && (
            <p role="alert" className="rounded bg-error-soft px-3 py-2 text-sm text-error-ink">
              {error}
            </p>
          )}
          {status && !error && (
            <p role="status" className="rounded bg-success-soft px-3 py-2 text-sm text-success-ink">
              {status}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            Save &amp; continue
          </button>
        </form>
      </div>
    </main>
  );
}
