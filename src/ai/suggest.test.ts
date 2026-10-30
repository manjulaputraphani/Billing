import { describe, it, expect } from "vitest";
import {
  AI_UNAVAILABLE,
  buildSummary,
  getAiSuggestions,
  parseAiReply,
  shouldAutoRefresh,
} from "./suggest";
import { buildSuggestions, type RuleStats } from "../logic/rules";
import type { chat } from "./ollama";

const STATS: RuleStats = {
  items: [
    {
      itemId: 1,
      itemName: "Rice",
      unit: "kg",
      stockLeft: 3000,
      minStock: 0,
      qtyUsed30d: 18000,
      qtyBought30d: 20000,
      wastage30d: 0,
      latestPricePaise: 1200,
      previousPricePaise: 1000,
    },
  ],
  monthSpendPaise: 11800,
  previousMonthSpendPaise: 10000,
};

const summary = buildSummary(STATS, buildSuggestions(STATS));

describe("AI suggestions (§F)", () => {
  it("keeps suggestions that only use numbers from the input", async () => {
    const reply = JSON.stringify([
      { type: "low_stock", itemName: "Rice", priority: 1, message: "Rice has 3 kg left and about 5 days. Buy soon." },
    ]);
    const result = await getAiSuggestions(STATS, { mode: "local", model: "m" }, undefined, (async () => ({
      content: reply,
      toolCalls: [],
    })) as unknown as typeof chat);

    expect(result.notice).toBeNull();
    expect(result.suggestions).toHaveLength(1);
  });

  it("drops a suggestion that invents a number", async () => {
    const reply = JSON.stringify([
      { type: "low_stock", itemName: "Rice", priority: 1, message: "Buy 27 kg of Rice today." },
      { type: "price_up", itemName: "Rice", priority: 2, message: "Rice went from ₹10 to ₹12 per kg." },
    ]);
    const result = await getAiSuggestions(STATS, { mode: "local", model: "m" }, undefined, (async () => ({
      content: reply,
      toolCalls: [],
    })) as unknown as typeof chat);

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions?.[0].type).toBe("price_up");
  });

  it("falls back when the model returns bad JSON", async () => {
    const result = await getAiSuggestions(STATS, { mode: "local", model: "m" }, undefined, (async () => ({
      content: "Sure! Here are some tips: buy more rice.",
      toolCalls: [],
    })) as unknown as typeof chat);

    expect(result.suggestions).toBeNull();
    expect(result.notice).toBe(AI_UNAVAILABLE);
  });

  it("falls back when Ollama is offline", async () => {
    const failing = (async () => {
      throw new Error("connection refused");
    }) as unknown as typeof chat;

    const result = await getAiSuggestions(STATS, { mode: "local", model: "m" }, undefined, failing);
    expect(result.suggestions).toBeNull();
    expect(result.notice).toBe(AI_UNAVAILABLE);
  });

  it("strips markdown fences around the JSON", () => {
    const raw = '```json\n[{"type":"low_stock","itemName":"Rice","priority":1,"message":"3 kg left, 5 days."}]\n```';
    expect(parseAiReply(raw, summary)).toHaveLength(1);
  });

  it("rejects a reply with more than 5 suggestions", () => {
    const many = JSON.stringify(
      Array.from({ length: 6 }, () => ({
        type: "low_stock",
        itemName: "Rice",
        priority: 1,
        message: "3 kg left",
      })),
    );
    expect(parseAiReply(many, summary)).toBeNull();
  });

  it("never sends raw money in paise or secrets in the summary", () => {
    const text = JSON.stringify(summary);
    expect(text).not.toContain("neondb_owner");
    expect(text).not.toContain("unitPricePaise");
    expect(text).toContain('"stock":3');
  });

  it("auto-refreshes at most once a day", () => {
    const now = new Date("2026-10-30T12:00:00Z");
    expect(shouldAutoRefresh(null, now)).toBe(true);
    expect(shouldAutoRefresh(new Date("2026-10-30T11:00:00Z"), now)).toBe(false);
    expect(shouldAutoRefresh(new Date("2026-10-29T11:00:00Z"), now)).toBe(true);
  });
});
