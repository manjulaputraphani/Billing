/**
 * India financial year: 1 April → 31 March.
 *
 * Apr–Dec belong to the FY that starts that year; Jan–Mar belong to the FY
 * that started the previous year. Label "2026-27" = 1 Apr 2026 → 31 Mar 2027.
 *
 * Pure, no DB, ISO dates only ("YYYY-MM-DD").
 */

export type FinYear = {
  /** Year the FY starts in — 2026 for "2026-27". */
  startYear: number;
  /** "2026-27" */
  label: string;
  /** "2026-04-01" */
  startDate: string;
  /** "2027-03-31" */
  endDate: string;
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LABEL_RE = /^(\d{4})-(\d{2})$/;

/** The FY that starts in `startYear` (2026 → 2026-27). */
export function finYear(startYear: number): FinYear {
  if (!Number.isInteger(startYear) || startYear < 1900 || startYear > 9999) {
    throw new Error(`Invalid financial year: ${startYear}`);
  }
  return {
    startYear,
    label: `${startYear}-${String(startYear + 1).slice(-2)}`,
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
  };
}

/** Which FY a transaction date falls in. */
export function finYearOfDate(date: string): FinYear {
  const match = DATE_RE.exec(date);
  if (!match) throw new Error(`Invalid date: ${date}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error(`Invalid date: ${date}`);
  // Apr-Dec → FY starting this year; Jan-Mar → FY that started last year.
  return finYear(month >= 4 ? year : year - 1);
}

/** "2026-27" for a transaction date. */
export function finYearLabelOf(date: string): string {
  return finYearOfDate(date).label;
}

/** "2026-27" → { startDate: "2026-04-01", endDate: "2027-03-31" }. */
export function finYearRange(label: string): { startDate: string; endDate: string } {
  const match = LABEL_RE.exec(label);
  if (!match) throw new Error(`Invalid financial year: ${label}`);
  const year = finYear(Number(match[1]));
  return { startDate: year.startDate, endDate: year.endDate };
}

/** True when the date is inside the FY (inclusive of both ends). */
export function isInFinYear(date: string, label: string): boolean {
  const range = finYearRange(label);
  return date >= range.startDate && date <= range.endDate;
}

/**
 * Every FY label from `earliest` to `latest` (inclusive), oldest first.
 * Used to fill the FY selector on the reports.
 */
export function listFinYearLabels(earliest: string, latest: string): string[] {
  const from = finYearOfDate(earliest).startYear;
  const to = finYearOfDate(latest).startYear;
  const labels: string[] = [];
  for (let year = from; year <= to; year += 1) labels.push(finYear(year).label);
  return labels;
}
