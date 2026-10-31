import { describe, expect, it } from "vitest";
import {
  finYear,
  finYearLabelOf,
  finYearOfDate,
  finYearRange,
  isInFinYear,
  listFinYearLabels,
} from "./finYear";

describe("financial year (India, 1 Apr – 31 Mar)", () => {
  it("puts Apr–Dec in the FY that starts that year", () => {
    expect(finYearLabelOf("2026-04-01")).toBe("2026-27");
    expect(finYearLabelOf("2026-06-15")).toBe("2026-27");
    expect(finYearLabelOf("2026-12-31")).toBe("2026-27");
  });

  it("puts Jan–Mar in the FY that started the previous year", () => {
    expect(finYearLabelOf("2027-01-01")).toBe("2026-27");
    expect(finYearLabelOf("2027-03-31")).toBe("2026-27");
  });

  it("gives the FY boundaries", () => {
    expect(finYearOfDate("2026-08-01")).toEqual({
      startYear: 2026,
      label: "2026-27",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
    });
  });

  it("turns a label back into a date range", () => {
    expect(finYearRange("2026-27")).toEqual({ startDate: "2026-04-01", endDate: "2027-03-31" });
    expect(finYearRange("2025-26")).toEqual({ startDate: "2025-04-01", endDate: "2026-03-31" });
  });

  it("knows which dates are inside an FY", () => {
    expect(isInFinYear("2026-04-01", "2026-27")).toBe(true);
    expect(isInFinYear("2027-03-31", "2026-27")).toBe(true);
    expect(isInFinYear("2026-03-31", "2026-27")).toBe(false);
    expect(isInFinYear("2027-04-01", "2026-27")).toBe(false);
  });

  it("lists the FYs between two dates, oldest first", () => {
    expect(listFinYearLabels("2025-06-01", "2027-02-01")).toEqual(["2025-26", "2026-27"]);
    expect(listFinYearLabels("2026-05-01", "2026-05-02")).toEqual(["2026-27"]);
  });

  it("rejects bad input", () => {
    expect(() => finYearOfDate("2026/04/01")).toThrow(/Invalid date/);
    expect(() => finYearRange("2026")).toThrow(/Invalid financial year/);
    expect(() => finYearOfDate("2026-13-01")).toThrow(/Invalid date/);
  });

  it("labels a FY from its start year", () => {
    expect(finYear(2026).label).toBe("2026-27");
    expect(finYear(2026).startYear).toBe(2026);
  });
});
