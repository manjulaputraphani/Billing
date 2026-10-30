import { useDb } from "../lib/db-context";
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

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Suggestions</h1>
        <button
          type="button"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          onClick={() => void reload()}
        >
          Refresh
        </button>
      </header>

      <p className="text-sm text-gray-500">
        Calculated from your own numbers — no AI involved.
      </p>

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
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
