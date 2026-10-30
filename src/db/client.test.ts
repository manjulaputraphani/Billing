import { describe, it, expect } from "vitest";
import { getDb } from "./client";

describe("getDb", () => {
  it("throws when no URL is passed in", () => {
    expect(() => getDb("")).toThrow(/url is required/i);
    expect(() => getDb("   ")).toThrow(/url is required/i);
  });

  it("accepts an injected URL and returns a handle without connecting", () => {
    const db = getDb("postgresql://user:pass@localhost:5432/dev");
    expect(typeof db.select).toBe("function");
    expect(typeof db.insert).toBe("function");
    expect(typeof db.transaction).toBe("function");
  });
});
