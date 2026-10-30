import { describe, it, expect } from "vitest";
import { paiseToWords } from "./moneyWords";

describe("amount in words", () => {
  it("matches the sample bill: ₹1,239.00", () => {
    expect(paiseToWords(123_900)).toBe("Indian Rupees One Thousand Two Hundred Thirty-Nine Only");
  });

  it("handles hundreds and zero", () => {
    expect(paiseToWords(10_500)).toBe("Indian Rupees One Hundred Five Only");
    expect(paiseToWords(0)).toBe("Indian Rupees Zero Only");
  });

  it("handles lakh and crore", () => {
    expect(paiseToWords(1_00_000 * 100)).toBe("Indian Rupees One Lakh Only");
    expect(paiseToWords(1_00_00_000 * 100)).toBe("Indian Rupees One Crore Only");
  });

  it("includes paise when present", () => {
    expect(paiseToWords(1050)).toBe("Indian Rupees Ten and Fifty Paise Only");
  });

  it("rejects negative or fractional paise", () => {
    expect(() => paiseToWords(-1)).toThrow();
    expect(() => paiseToWords(10.5)).toThrow();
  });
});
