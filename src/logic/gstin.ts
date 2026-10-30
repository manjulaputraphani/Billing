/**
 * GSTIN validation — PURE (no network). The GST portal has no public API, so the
 * app validates the format + official check digit and only auto-fills from
 * customers already saved in the DB. Never blocks saving on a checksum mismatch
 * (some shops use test/placeholder GSTINs).
 */

const FORMAT = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function charValue(char: string): number {
  return /\d/.test(char) ? Number(char) : char.charCodeAt(0) - 55;
}

function charFromValue(value: number): string {
  return String.fromCharCode(value < 10 ? 48 + value : 55 + value);
}

/** Official GSTIN check digit: mod-36 over the first 14 characters. */
export function gstinCheckChar(gstin: string): string {
  const values = [...gstin.slice(0, 14)].map(charValue);
  const sum = values.reduce((acc, value, index) => {
    const product = value * (index % 2 === 0 ? 1 : 2);
    return acc + Math.floor(product / 36) + (product % 36);
  }, 0);
  return charFromValue((36 - (sum % 36)) % 36);
}

export type GstinCheck = {
  normalized: string;
  valid: boolean;
  reason: string | null;
};

export function validateGstin(input: string): GstinCheck {
  const normalized = input.trim().toUpperCase();
  if (normalized.length === 0) {
    return { normalized, valid: false, reason: null };
  }
  if (normalized.length !== 15) {
    return { normalized, valid: false, reason: "GSTIN must be 15 characters" };
  }
  if (!FORMAT.test(normalized)) {
    return { normalized, valid: false, reason: "Not a valid GSTIN format" };
  }
  const expected = gstinCheckChar(normalized);
  if (normalized[14] !== expected) {
    return {
      normalized,
      valid: false,
      reason: `Check digit should be ${expected} — please re-check the GSTIN`,
    };
  }
  return { normalized, valid: true, reason: null };
}
