import { describe, it, expect } from "vitest";
import { monthRange, parseExpenseInput } from "./expenses";

const base = { category: "Rent", amountPaise: 50000, date: "2026-10-05" };

describe("parseExpenseInput (zod)", () => {
  it("accepts a valid expense", () => {
    const parsed = parseExpenseInput(base);
    expect(parsed.amountPaise).toBe(50000);
    expect(parsed.category).toBe("Rent");
  });

  it("requires a category", () => {
    expect(() => parseExpenseInput({ ...base, category: "   " })).toThrow(/Category is required/i);
  });

  it("requires amount > 0", () => {
    expect(() => parseExpenseInput({ ...base, amountPaise: 0 })).toThrow(/more than 0/i);
    expect(() => parseExpenseInput({ ...base, amountPaise: -100 })).toThrow(/more than 0/i);
  });

  it("requires amount in whole paise", () => {
    expect(() => parseExpenseInput({ ...base, amountPaise: 10.5 })).toThrow(/whole paise/i);
  });

  it("requires a valid date", () => {
    expect(() => parseExpenseInput({ ...base, date: "" })).toThrow(/valid date/i);
    expect(() => parseExpenseInput({ ...base, date: "05-10-2026" })).toThrow(/valid date/i);
  });

  it("allows a custom category", () => {
    expect(parseExpenseInput({ ...base, category: "Festival bonus" }).category).toBe(
      "Festival bonus",
    );
  });
});

describe("monthRange", () => {
  it("covers a whole month, half-open", () => {
    expect(monthRange("2026-10")).toEqual({ start: "2026-10-01", end: "2026-11-01" });
  });

  it("rolls over to the next year in December", () => {
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
});
