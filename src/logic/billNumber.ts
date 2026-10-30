/**
 * Bill numbering — PURE (docs/PLAN_V2.md §Phase 10): `SD-2026-000001`.
 * The year comes from the sale date; the sequence resets every calendar year.
 */

const SEQ_MAX = 999_999;

/** 2026 + 1 → "SD-2026-000001". */
export function formatBillNo(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new Error("Invalid bill year");
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > SEQ_MAX) {
    throw new Error("Invalid bill sequence");
  }
  return `SD-${year}-${String(sequence).padStart(6, "0")}`;
}

/** "2026-10-31" → 2026. Throws on a malformed date. */
export function billYear(saleDate: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
    throw new Error("Invalid sale date");
  }
  return Number(saleDate.slice(0, 4));
}

/** Next sequence for a year, given the highest existing sequence (0 when none). */
export function nextSequence(highestExisting: number): number {
  if (!Number.isInteger(highestExisting) || highestExisting < 0) {
    throw new Error("Invalid bill sequence");
  }
  return highestExisting + 1;
}
