import { describe, expect, it } from "vitest";
import { normalisePhone, parseCustomerInput } from "./customers";

describe("customer master", () => {
  it("stores the phone as digits only", () => {
    expect(normalisePhone("98765 43210")).toBe("9876543210");
    expect(normalisePhone("+91 98765-43210")).toBe("919876543210");
    expect(normalisePhone("")).toBeNull();
    expect(normalisePhone(null)).toBeNull();
  });

  it("needs a name", () => {
    expect(() => parseCustomerInput({ name: "" })).toThrow(/Customer name is required/);
    expect(parseCustomerInput({ name: "  KALKI  " }).name).toBe("KALKI");
  });

  it("accepts the optional master fields", () => {
    const parsed = parseCustomerInput({
      name: "Kalki",
      phone: "9876543210",
      gstin: "37aabct1234c1z5",
      email: "kalki@example.com",
      address: "12 Market Road",
    });
    expect(parsed.name).toBe("Kalki");
    expect(parsed.gstin).toBe("37aabct1234c1z5");
    expect(parsed.email).toBe("kalki@example.com");
  });
});
