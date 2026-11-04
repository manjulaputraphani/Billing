import type { Indicator } from "../logic/analytics";

/** Green ▲ / red ▼ / grey ● with the pct, used on both analytics pages. */
export function Trend({ ind }: { ind: Indicator }) {
  const cls =
    ind.direction === "up" ? "text-success-ink" : ind.direction === "down" ? "text-error-ink" : "text-muted";
  const mark = ind.direction === "up" ? "▲" : ind.direction === "down" ? "▼" : "●";
  return (
    <span className={`text-xs ${cls}`}>
      {mark} {ind.pct.toFixed(2)}%
    </span>
  );
}