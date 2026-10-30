import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { chat } from "../ai/ollama";
import { DEFAULT_AI_CONFIG, getAiConfig, saveAiConfig, type AiConfig } from "../db/settings";
import { useDb } from "../lib/db-context";
import { deleteSecret, getSecret, saveSecret, SECRET_KEYS } from "../lib/secrets";

export default function Settings({ onReset }: { onReset: () => void }) {
  const db = useDb();
  const [ai, setAi] = useState<AiConfig>(DEFAULT_AI_CONFIG);
  const [aiKeySaved, setAiKeySaved] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => setVersion(null));
  }, []);

  useEffect(() => {
    getAiConfig(db)
      .then(setAi)
      .catch(() => setAi(DEFAULT_AI_CONFIG));
  }, [db]);

  async function persistAi(next: AiConfig) {
    setAi(next);
    try {
      await saveAiConfig(db, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveKey() {
    const value = keyInput.trim();
    if (!value) return;
    try {
      await saveSecret(SECRET_KEYS.OLLAMA_API_KEY, value);
      setKeyInput("");
      setAiKeySaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function testAi() {
    setAiStatus("Testing…");
    try {
      const apiKey = ai.mode === "cloud" ? await getSecret(SECRET_KEYS.OLLAMA_API_KEY) : null;
      await chat({ ...ai, apiKey }, [
        { role: "user", content: "Reply with the single word OK." },
      ]);
      setAiStatus("AI OK");
    } catch (err) {
      setAiStatus(`AI failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

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

      <section className="space-y-3 rounded border border-gray-200 bg-white p-4">
        <div>
          <h2 className="text-sm font-medium">AI assistant</h2>
          <p className="text-sm text-gray-500">
            Optional. The app always shows rule-based suggestions without it.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ai.enabled}
            onChange={(e) => void persistAi({ ...ai, enabled: e.currentTarget.checked })}
          />
          Use AI
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="ai-mode">
              Mode
            </label>
            <select
              id="ai-mode"
              className="w-full rounded border border-gray-300 px-3 py-2"
              value={ai.mode}
              onChange={(e) =>
                void persistAi({ ...ai, mode: e.currentTarget.value === "cloud" ? "cloud" : "local" })
              }
            >
              <option value="local">local (Ollama on this Mac)</option>
              <option value="cloud">cloud (ollama.com)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="ai-model">
              Model
            </label>
            <input
              id="ai-model"
              className="w-full rounded border border-gray-300 px-3 py-2"
              value={ai.model}
              onChange={(e) => setAi({ ...ai, model: e.currentTarget.value })}
              onBlur={() => void persistAi(ai)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="ai-key">
            Cloud API key
          </label>
          <div className="flex gap-2">
            <input
              id="ai-key"
              type="password"
              autoComplete="off"
              className="flex-1 rounded border border-gray-300 px-3 py-2"
              placeholder={aiKeySaved ? "Key saved — enter a new one to replace" : "Ollama cloud key"}
              value={keyInput}
              onChange={(e) => setKeyInput(e.currentTarget.value)}
            />
            <button
              type="button"
              className="rounded border border-gray-300 px-3 py-2 text-sm"
              onClick={() => void saveKey()}
            >
              Save key
            </button>
          </div>
          {aiKeySaved && <p className="text-xs text-green-700">Key saved ✓</p>}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-1 text-sm"
            onClick={() => void testAi()}
          >
            Test AI
          </button>
          {aiStatus && <span className="text-sm text-gray-600">{aiStatus}</span>}
        </div>
      </section>

      <p className="text-sm text-gray-500">More settings coming soon.</p>

      <p className="text-xs text-gray-400">Stock Tracker v{version ?? "—"}</p>

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
