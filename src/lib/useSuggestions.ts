import { useCallback, useEffect, useState } from "react";
import type { Db } from "../db/client";
import {
  dismissedKeys,
  dismissSuggestion,
  loadRuleStats,
  suggestionKey,
} from "../db/suggestions";
import { buildSuggestions, type Suggestion } from "../logic/rules";

/** Rule-based suggestions for a month, minus whatever the user dismissed. */
export function useSuggestions(db: Db, month: string) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stats, dismissed] = await Promise.all([
        loadRuleStats(db, month),
        dismissedKeys(db),
      ]);
      setSuggestions(buildSuggestions(stats).filter((s) => !dismissed.has(suggestionKey(s))));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [db, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const dismiss = useCallback(
    async (suggestion: Suggestion) => {
      await dismissSuggestion(db, suggestion);
      setSuggestions((prev) =>
        prev.filter((s) => suggestionKey(s) !== suggestionKey(suggestion)),
      );
    },
    [db],
  );

  return { suggestions, loading, error, reload: load, dismiss };
}
