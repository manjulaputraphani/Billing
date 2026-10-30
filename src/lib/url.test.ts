import { describe, it, expect } from "vitest";
import { hostOf, hostLabel } from "./url";

describe("hostOf", () => {
  it("extracts only the hostname from a Neon URL", () => {
    expect(hostOf("postgresql://user:secret@ep-shiny-king-pooler.c-2.us-east-1.aws.neon.tech/db?sslmode=require")).toBe(
      "ep-shiny-king-pooler.c-2.us-east-1.aws.neon.tech",
    );
  });

  it("returns null for junk input", () => {
    expect(hostOf("not a url")).toBeNull();
    expect(hostOf("")).toBeNull();
  });

  it("never returns credentials", () => {
    const host = hostOf("postgresql://user:pw@host.example/db");
    expect(host).toBe("host.example");
    expect(host).not.toContain("pw");
  });

  it("hostLabel falls back to a neutral phrase", () => {
    expect(hostLabel("nonsense")).toBe("the database");
  });
});
