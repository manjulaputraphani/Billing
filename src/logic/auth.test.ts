import { describe, it, expect } from "vitest";
import { normalizePhone, validatePassword } from "./auth";

describe("phone normalization", () => {
  it("accepts a plain 10-digit number", () => {
    expect(normalizePhone("9876543210")).toEqual({
      phone: "9876543210",
      valid: true,
      reason: null,
    });
  });

  it("strips +91, 0 prefix, spaces and dashes", () => {
    expect(normalizePhone("+91 98765 43210").phone).toBe("9876543210");
    expect(normalizePhone("098765-43210").phone).toBe("9876543210");
    expect(normalizePhone("+91-9876543210").phone).toBe("9876543210");
  });

  it("rejects wrong length and bad starting digit", () => {
    expect(normalizePhone("12345").reason).toBe("Phone number must be 10 digits");
    expect(normalizePhone("1234567890").reason).toBe("Phone number must start with 6, 7, 8 or 9");
    expect(normalizePhone("").reason).toBe("Enter a phone number");
  });
});

describe("password rules", () => {
  it("requires at least 6 characters", () => {
    expect(validatePassword("12345").valid).toBe(false);
    expect(validatePassword("12345").reason).toContain("6");
    expect(validatePassword("123456").valid).toBe(true);
    expect(validatePassword("a-strong-pass").valid).toBe(true);
  });
});
