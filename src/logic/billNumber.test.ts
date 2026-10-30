import { describe, it, expect } from "vitest";
import { billYear, formatBillNo, nextSequence } from "./billNumber";

describe("bill numbers", () => {
  it("formats SD-<year>-<6 digits>", () => {
    expect(formatBillNo(2026, 1)).toBe("SD-2026-000001");
    expect(formatBillNo(2026, 42)).toBe("SD-2026-000042");
    expect(formatBillNo(2030, 999999)).toBe("SD-2030-999999");
  });

  it("reads the year from the sale date", () => {
    expect(billYear("2026-10-31")).toBe(2026);
    expect(() => billYear("31-10-2026")).toThrow("Invalid sale date");
  });

  it("increments the sequence and starts at 1", () => {
    expect(nextSequence(0)).toBe(1);
    expect(nextSequence(41)).toBe(42);
  });

  it("rejects impossible sequences and years", () => {
    expect(() => formatBillNo(2026, 0)).toThrow("Invalid bill sequence");
    expect(() => formatBillNo(2026, 1_000_000)).toThrow("Invalid bill sequence");
    expect(() => formatBillNo(1999, 1)).toThrow("Invalid bill year");
  });
});
