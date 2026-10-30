import { describe, it, expect } from "vitest";
import { gstFromInclusive, gstFromRate, splitGst } from "./gst";

describe("GST math", () => {
  it("₹105 incl. 5% → taxable ₹100, GST ₹5, CGST ₹2.50, SGST ₹2.50", () => {
    const r = gstFromInclusive(10_500, 500);
    expect(r.taxablePaise).toBe(10_000);
    expect(r.gstPaise).toBe(500);
    expect(r.cgstPaise).toBe(250);
    expect(r.sgstPaise).toBe(250);
  });

  it("computes GST on an exclusive taxable value", () => {
    expect(gstFromRate(10_000, 500)).toBe(500); // 5%
    expect(gstFromRate(10_000, 1800)).toBe(1800); // 18%
    expect(gstFromRate(10_000, 0)).toBe(0);
  });

  it("rounds to the nearest paise", () => {
    // 999 paise @ 5% = 49.95 → 50
    expect(gstFromRate(999, 500)).toBe(50);
  });

  it("splits odd paise exactly", () => {
    expect(splitGst(501)).toEqual({ cgstPaise: 250, sgstPaise: 251 });
    expect(splitGst(0)).toEqual({ cgstPaise: 0, sgstPaise: 0 });
  });

  it("rejects bad input", () => {
    expect(() => gstFromRate(-1, 500)).toThrow();
    expect(() => gstFromRate(100, 5.5)).toThrow();
    expect(() => splitGst(-5)).toThrow();
  });
});
