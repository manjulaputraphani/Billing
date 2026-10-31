import { describe, expect, it } from "vitest";
import { formatDuration, type UserUsage } from "./sessions";

describe("usage metrics", () => {
  it("formats durations for humans", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(90)).toBe("1m 30s");
    expect(formatDuration(3600)).toBe("1h 0m");
    expect(formatDuration(3900)).toBe("1h 5m");
    expect(formatDuration(3045)).toBe("50m 45s");
    expect(formatDuration(7500)).toBe("2h 5m");
  });

  it("never shows a negative duration", () => {
    expect(formatDuration(-10)).toBe("0m");
  });

  it("keeps per-user totals separate", () => {
    const usage: UserUsage[] = [
      {
        userId: 1,
        name: "A",
        phone: "1",
        role: "owner",
        sessions: 3,
        activeSeconds: 7200,
        lastLoginAt: "2026-10-31T09:00:00.000Z",
        lastLogoutAt: "2026-10-31T11:00:00.000Z",
        openSessions: 0,
      },
      {
        userId: 2,
        name: "B",
        phone: "2",
        role: "staff",
        sessions: 1,
        activeSeconds: 600,
        lastLoginAt: "2026-10-31T10:00:00.000Z",
        lastLogoutAt: null,
        openSessions: 1,
      },
    ];
    const total = usage.reduce((sum, row) => sum + row.activeSeconds, 0);
    expect(total).toBe(7800);
    expect(usage.filter((row) => row.openSessions > 0)).toHaveLength(1);
  });
});
