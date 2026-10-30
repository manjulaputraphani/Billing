/**
 * GST helpers — PURE, money in integer paise (docs/PLAN_V2.md §Phase 13, used by P10 billing).
 * Rates are basis points: 5% = 500, 18% = 1800.
 */

/** GST amount for a taxable value at a rate, rounded to the nearest paise. */
export function gstFromRate(taxablePaise: number, rateBp: number): number {
  if (!Number.isInteger(taxablePaise) || taxablePaise < 0) {
    throw new Error("Taxable amount must be whole paise");
  }
  if (!Number.isInteger(rateBp) || rateBp < 0) {
    throw new Error("GST rate must be basis points");
  }
  return Math.round((taxablePaise * rateBp) / 10_000);
}

/** Split GST into CGST + SGST; odd paise go to SGST so the sum is exact. */
export function splitGst(gstPaise: number): { cgstPaise: number; sgstPaise: number } {
  if (!Number.isInteger(gstPaise) || gstPaise < 0) {
    throw new Error("GST must be whole paise");
  }
  const cgstPaise = Math.floor(gstPaise / 2);
  return { cgstPaise, sgstPaise: gstPaise - cgstPaise };
}

/** ₹105 incl. 5% → taxable ₹100, GST ₹5, CGST ₹2.50, SGST ₹2.50. */
export function gstFromInclusive(totalPaise: number, rateBp: number): {
  taxablePaise: number;
  gstPaise: number;
  cgstPaise: number;
  sgstPaise: number;
} {
  if (!Number.isInteger(totalPaise) || totalPaise < 0) {
    throw new Error("Total must be whole paise");
  }
  if (!Number.isInteger(rateBp) || rateBp < 0) {
    throw new Error("GST rate must be basis points");
  }
  const taxablePaise = Math.round((totalPaise * 10_000) / (10_000 + rateBp));
  const gstPaise = totalPaise - taxablePaise;
  return { taxablePaise, gstPaise, ...splitGst(gstPaise) };
}
