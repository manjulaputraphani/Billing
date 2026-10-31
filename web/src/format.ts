/**
 * Shared date formatting for the whole app.
 *
 * - formatDate("2026-10-31")        → "31 Oct 2026"
 * - formatDateTime("2026-10-31T…")  → "31 Oct 2026, 8:35 PM"
 *
 * Date-only strings are parsed as local dates so they never shift a day.
 */
function parseDate(value: string | Date): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value: string | Date): string {
  const date = parseDate(value);
  if (!date) return typeof value === "string" ? value : "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | Date): string {
  const date = parseDate(value);
  if (!date) return typeof value === "string" ? value : "";
  return date
    .toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\b(am|pm)\b/i, (match) => match.toUpperCase());
}
