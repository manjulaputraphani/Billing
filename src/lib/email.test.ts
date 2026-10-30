import { describe, it, expect } from "vitest";
import { billEmailSubject } from "./email";

describe("bill email subject", () => {
  it("includes the bill number and shop name", () => {
    expect(billEmailSubject("SD-2026-000004", "SRI DURGA HARI HARA ENTERPRISES")).toBe(
      "Invoice SD-2026-000004 — SRI DURGA HARI HARA ENTERPRISES",
    );
  });

  it("falls back when the shop name is blank", () => {
    expect(billEmailSubject("SD-2026-000001", "   ")).toBe("Invoice SD-2026-000001 — Tax Invoice");
  });
});
