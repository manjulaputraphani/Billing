import { describe, it, expect, vi } from "vitest";
import { askAssistant } from "./chat";
import { TOOL_NAMES } from "./tools";
import type { chat } from "./ollama";

const db = { execute: vi.fn() } as never;

describe("chat with read-only tools (§F)", () => {
  it("runs get_item_usage and returns the final answer", async () => {
    (db as unknown as { execute: ReturnType<typeof vi.fn> }).execute.mockResolvedValue({
      rows: [{ item: "Rice", unit: "kg", used_base: 2000, wasted_base: 0 }],
    });

    const replies = [
      { content: "", toolCalls: [{ name: "get_item_usage", arguments: {} }] },
      { content: "You used 2.00 kg of Rice this month.", toolCalls: [] },
    ];
    let call = 0;
    const chatImpl = (async () => replies[call++]) as unknown as typeof chat;

    const result = await askAssistant(
      db,
      { mode: "local", model: "m" },
      [],
      "How much rice did I use this month?",
      chatImpl,
    );

    expect(result.usedTools).toContain("get_item_usage");
    expect(result.answer).toContain("2.00 kg");
  });

  it("stops after 5 rounds instead of looping forever", async () => {
    const chatImpl = (async () => ({
      content: "",
      toolCalls: [{ name: "get_low_stock_items", arguments: {} }],
    })) as unknown as typeof chat;

    (db as unknown as { execute: ReturnType<typeof vi.fn> }).execute.mockResolvedValue({ rows: [] });

    const result = await askAssistant(db, { mode: "local", model: "m" }, [], "loop?", chatImpl);
    expect(result.usedTools).toHaveLength(5);
    expect(result.answer).toMatch(/too many steps/i);
  });

  it("has no write tool at all — a delete request cannot be executed", async () => {
    const writeNames = ["insert", "update", "delete", "create", "drop", "truncate"];
    for (const name of TOOL_NAMES) {
      expect(writeNames.some((w) => name.includes(w))).toBe(false);
    }
    expect(TOOL_NAMES).toEqual([
      "get_item_usage",
      "get_price_history",
      "get_low_stock_items",
      "get_spending_by_category",
      "get_supplier_comparison",
      "get_stock_value",
    ]);
  });

  it("refuses an unknown tool instead of touching the database", async () => {
    (db as unknown as { execute: ReturnType<typeof vi.fn> }).execute.mockReset();
    const replies = [
      { content: "", toolCalls: [{ name: "delete_all_data", arguments: {} }] },
      { content: "I can only read data.", toolCalls: [] },
    ];
    let call = 0;
    const chatImpl = (async () => replies[call++]) as unknown as typeof chat;

    const result = await askAssistant(
      db,
      { mode: "local", model: "m" },
      [],
      "delete all data",
      chatImpl,
    );

    expect(result.usedTools).toEqual(["delete_all_data"]);
    expect(
      (db as unknown as { execute: ReturnType<typeof vi.fn> }).execute,
    ).not.toHaveBeenCalled();
    expect(result.answer).toMatch(/only read data/i);
  });

  it("only sends the last 10 history messages", async () => {
    const seen: unknown[] = [];
    const chatImpl = (async (_cfg: unknown, messages: unknown) => {
      seen.push(...(messages as unknown[]));
      return { content: "ok", toolCalls: [] };
    }) as unknown as typeof chat;

    const history = Array.from({ length: 20 }, (_, index) => ({
      role: "user" as const,
      content: `old ${index}`,
    }));

    await askAssistant(db, { mode: "local", model: "m" }, history, "now", chatImpl);

    // system + 10 history + question
    expect(seen).toHaveLength(12);
    expect(JSON.stringify(seen)).not.toContain("old 9");
  });
});
