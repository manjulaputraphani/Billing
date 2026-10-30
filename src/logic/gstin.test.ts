import { describe, it, expect } from "vitest";
import { gstinCheckChar, validateGstin } from "./gstin";

describe("GSTIN validation", () => {
  it("accepts known-valid GSTINs", () => {
    expect(validateGstin("27AAPFU0939F1ZV").valid).toBe(true);
    expect(validateGstin("29AAGCB7383J1Z4").valid).toBe(true);
  });

  it("normalizes lowercase and trims spaces", () => {
    const check = validateGstin(" 27aapfu0939f1zv ");
    expect(check.normalized).toBe("27AAPFU0939F1ZV");
    expect(check.valid).toBe(true);
  });

  it("rejects a wrong check digit", () => {
    const check = validateGstin("27AAPFU0939F1ZW");
    expect(check.valid).toBe(false);
    expect(check.reason).toContain("Check digit");
  });

  it("rejects bad format and length", () => {
    expect(validateGstin("12345").reason).toBe("GSTIN must be 15 characters");
    expect(validateGstin("27AAPFU0939F1Z!").reason).toBe("Not a valid GSTIN format");
    expect(validateGstin("").reason).toBeNull();
  });

  it("computes the documented check characters", () => {
    expect(gstinCheckChar("27AAPFU0939F1Z")).toBe("V");
    expect(gstinCheckChar("29AAGCB7383J1Z")).toBe("4");
  });
});
