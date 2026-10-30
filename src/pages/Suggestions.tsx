import { useCallback, useEffect, useState } from "react";
import { getAiSuggestions, shouldAutoRefresh, type AiSuggestion } from "../ai/suggest";
import { getAiConfig } from "../db/settings";
import {
  listStoredSuggestions,
  loadRuleStats,
  replaceStoredSuggestions,
} from "../db/suggestions";
import { useDb } from "../lib/db-context";
import { getSecret, SECRET_KEYS } from "../lib/secrets";
import { useSuggestions } from "../lib/useSuggestions";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const TONE: Record<number, string> = {
  1: "border-red-200 bg-red-50",
  2: "border-amber-200 bg-amber-50",
  3: "border-gray-200 bg-white",
};

export default function Suggestions() {
  const db = useDb();
  const month = currentMonth();
  const { suggestions, loading, error, reload, dismiss } = useSuggestions(db, month);
  const [aiItems, setAiItems] = useState<AiSuggestion[] | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const refreshAi = useCallback(async () => {
    setAiBusy(true);
    setAiNotice(null);
    try {
      const config = await getAiConfig(db);
      if (!config.enabled) {
        setAiNotice("AI is off - enable it in Settings");
        setAiItems(null);
        return;
      }
      const apiKey =
        config.mode === "cloud" ? await getSecret(SECRET_KEYS.OLLAMA_API_KEY) : null;
      const stats = await loadRuleStats(db, month);
      const result = await getAiSuggestions(stats, { ...config, apiKey });
      setAiItems(result.suggestions);
      setAiNotice(result.notice);
      if (result.suggestions) {
        await replaceStoredSuggestions(
          db,
          result.suggestions.map((s) => ({
            type: s.type,
            itemId: null,
            message: s.message,
            priority: s.priority,
          })),
        );
      }
    } catch (err) {
      setAiNotice(err instanceof Error ? err.message : String(err));
      setAiItems(null);
    } finally {
      setAiBusy(false);
    }
  }, [db, month]);

  // Auto-refresh at most once per day, and only when AI is switched on.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const config = await getAiConfig(db);
        if (!config.enabled || cancelled) return;
        const stored = await listStoredSuggestions(db);
        if (shouldAutoRefresh(stored[0]?.createdAt ?? null) && !cancelled) {
          await refreshAi();
        }
      } catch {
        /* fall back to rule suggestions */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, refreshAi]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Suggestions</h1>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            onClick={() => void reload()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            onClick={() => void refreshAi()}
            disabled={aiBusy}
          >
            {aiBusy ? "Asking AI…" : "Refresh AI suggestions"}
          </button>
        </div>
      </header>

      <p className="text-sm text-gray-500">
        Calculated from your own numbers — no AI involved.
      </p>

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {aiNotice && (
        <p role="status" className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {aiNotice}
        </p>
      )}

      {aiItems && aiItems.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Explained by AI
          </h2>
          <ul className="space-y-2">
            {aiItems.map((item, index) => (
              <li key={index} className="rounded border border-gray-200 bg-white p-3 text-sm">
                {item.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && suggestions.length === 0 && (
        <section className="rounded border border-dashed border-gray-300 p-6 text-center text-gray-500">
          Nothing to flag right now.
        </section>
      )}

      <ul className="space-y-2">
        {suggestions.map((suggestion) => (
          <li
            key={`${suggestion.type}:${suggestion.itemId ?? "all"}`}
            className={`flex items-start justify-between gap-3 rounded border p-3 ${TONE[suggestion.priority]}`}
          >
            <div>
              <p className="text-sm">{suggestion.message}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                {suggestion.type.replace("_", " ")}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs"
              onClick={() => void dismiss(suggestion)}
            >
              Dismiss
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
