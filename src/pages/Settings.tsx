import { useState } from "react";
import { deleteSecret, SECRET_KEYS } from "../lib/secrets";

export default function Settings({ onReset }: { onReset: () => void }) {
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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="space-y-3 rounded border border-gray-200 bg-white p-4">
        <div>
          <h2 className="text-sm font-medium">Connection</h2>
          <p className="text-sm text-gray-500">
            Remove the saved database connection and PIN from this computer.
          </p>
        </div>
        <button
          type="button"
          className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
          onClick={() => setConfirming(true)}
        >
          Reset connection
        </button>
      </section>

      <p className="text-sm text-gray-500">More settings coming soon.</p>

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
    </div>
  );
}
