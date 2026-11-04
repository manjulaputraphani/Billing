import { describe, expect, it } from "vitest";
import { billPdfName } from "./billPdf";

describe("billPdfName", () => {
  it("makes a safe bin file name from the bill number", () => {
    expect(billPdfName("SD-2026-000001")).toBe("SD-2026-000001.pdf");
  });

  it("strips path separators, spaces and unsafe characters", () => {
    expect(billPdfName("../evil/SD 1")).toBe("evilSD1.pdf");
  });

  it("falls back to a neutral name when nothing safe is left", () => {
    expect(billPdfName("///")).toBe("bill.pdf");
  });
});