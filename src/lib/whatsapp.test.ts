import { describe, expect, it } from "vitest";
import { billWhatsAppText, buildWhatsAppLink, waPhone } from "./whatsapp";
import { formatRupees } from "../logic/units";

describe("waPhone", () => {
  it("returns null for missing or digit-free phones", () => {
    expect(waPhone(null)).toBeNull();
    expect(waPhone(undefined)).toBeNull();
    expect(waPhone("")).toBeNull();
    expect(waPhone("   ")).toBeNull();
    expect(waPhone("not-a-phone")).toBeNull();
  });

  it("assumes +91 for a 10-digit Indian mobile", () => {
    expect(waPhone("98765 43210")).toBe("919876543210");
    expect(waPhone("09876543210")).toBe("919876543210");
  });

  it("keeps numbers that already carry a country code", () => {
    expect(waPhone("+91-9876543210")).toBe("919876543210");
    expect(waPhone("919876543210")).toBe("919876543210");
    expect(waPhone("+1 (555) 123-4567")).toBe("15551234567");
  });

  it("rejects numbers of impossible length", () => {
    expect(waPhone("12345")).toBeNull();
    expect(waPhone("1234567890123456")).toBeNull();
  });
});

describe("billWhatsAppText", () => {
  it("summarises a fully paid bill", () => {
    const text = billWhatsAppText(
      { billNo: "SD-2026-000001", saleDate: "2026-10-30", totalPaise: 787500, paidPaise: 787500 },
      "SREE DURGA HARIHARA ENTERPRISES",
    );
    expect(text).toContain("SD-2026-000001");
    expect(text).toContain("SREE DURGA HARIHARA ENTERPRISES");
    expect(text).toContain("2026-10-30");
    expect(text).toContain(formatRupees(787500));
    expect(text).not.toContain("Credit due");
  });

  it("mentions the credit still due on a partly paid bill", () => {
    const text = billWhatsAppText(
      { billNo: "SD-2026-000002", saleDate: "2026-10-31", totalPaise: 500000, paidPaise: 200000 },
      "SREE DURGA HARIHARA ENTERPRISES",
    );
    expect(text).toContain(formatRupees(300000));
    expect(text).toContain("Credit due");
  });

  it("falls back to a neutral title when the shop name is blank", () => {
    const text = billWhatsAppText(
      { billNo: "SD-2026-000003", saleDate: "2026-11-01", totalPaise: 100, paidPaise: 100 },
      "  ",
    );
    expect(text).toContain("Tax Invoice SD-2026-000003");
  });
});

describe("buildWhatsAppLink", () => {
  it("builds a wa.me link with the text pre-filled", () => {
    expect(buildWhatsAppLink("98765 43210", "Hello there")).toBe(
      "https://wa.me/919876543210?text=Hello%20there",
    );
  });

  it("returns null when the phone is unusable", () => {
    expect(buildWhatsAppLink(null, "Hello")).toBeNull();
    expect(buildWhatsAppLink("abc", "Hello")).toBeNull();
  });
});