/** Host-only display helpers — the full connection string must never be shown. */

/** "postgresql://u:p@ep-x.neon.tech/db?sslmode=require" → "ep-x.neon.tech" */
export function hostOf(url: string): string | null {
  try {
    return new URL(url.trim()).hostname || null;
  } catch {
    return null;
  }
}

/** Safe label for UI: the host, or a neutral fallback. Never the password. */
export function hostLabel(url: string): string {
  return hostOf(url) ?? "the database";
}
