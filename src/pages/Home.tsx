import { useState } from "react";
import { deleteSecret, SECRET_KEYS } from "../lib/secrets";

/** Placeholder home screen. Real dashboard is T-3+; this only proves the unlock flow. */
export default function Home({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resetConnection() {
    setBusy(true);
    setError(null);
    try {
      await deleteSecret(SECRET_KEYS.DATABASE_URL);
      await deleteSecret(SECRET_KEYS.PIN_HASH);
      onReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stock Tracker</h1>
        <button
          type="button"
          className="rounded border border-gray-300 px-3 py-1 text-sm"
          onClick={() => setConfirming(true)}
        >
          Reset connection
        </button>
      </header>

      <section className="rounded border border-dashed border-gray-300 p-6 text-center text-gray-500">
        Dashboard coming soon
      </section>

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-title"
          className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-sm space-y-4 rounded bg-white p-5 shadow-lg">
            <h2 id="reset-title" className="text-lg font-semibold">
              Reset connection?
            </h2>
            <p className="text-sm text-gray-600">
              This removes the saved database connection and PIN from this computer. Your data in
              the database is not deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-gray-300 px-3 py-1 text-sm"
                onClick={() => setConfirming(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                onClick={resetConnection}
                disabled={busy}
              >
                Yes, reset
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
