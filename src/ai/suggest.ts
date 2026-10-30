import { z } from "zod";
import { chat, type ChatReply, type OllamaConfig } from "./ollama";
import { buildSuggestions, type RuleStats, type Suggestion } from "../logic/rules";
import { baseFactor } from "../logic/units";
import { dailyUsage, daysLeft } from "../logic/stats";

export const aiSuggestionSchema = z.object({
  type: z.string().min(1).max(40),
  itemName: z.string().min(1).max(80),
  priority: z.number().int().min(1).max(3),
  message: z.string().min(1).max(300),
});

export const aiReplySchema = z.array(aiSuggestionSchema).max(5);

export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;

export const AI_SYSTEM_PROMPT = [
  "You are a stock and expense assistant for a small shop in India.",
  "Use ONLY the numbers given. Never calculate or invent numbers.",
  "Give at most 5 short suggestions, each with one clear action.",
  "Use ₹.",
  'Reply ONLY as a JSON array: [{"type", "itemName", "priority", "message"}].',
].join(" ");

export const AI_UNAVAILABLE = "AI unavailable, showing basic suggestions";

const round2 = (value: number) => Math.round(value * 100) / 100;

/** A small, human-readable summary — never raw tables, never secrets. */
export function buildSummary(stats: RuleStats, rules: Suggestion[]) {
  return {
    items: stats.items.map((item) => {
      const factor = baseFactor(item.unit);
      const perDay = dailyUsage(item.qtyUsed30d, 30);
      return {
        name: item.itemName,
        unit: item.unit,
        stock: round2(item.stockLeft / factor),
        minStock: round2(item.minStock / factor),
        used30d: round2(item.qtyUsed30d / factor),
        bought30d: round2(item.qtyBought30d / factor),
        wastage30d: round2(item.wastage30d / factor),
        daysLeft: daysLeft(item.stockLeft, perDay),
        latestPriceRupees:
          item.latestPricePaise === null ? null : round2(item.latestPricePaise / 100),
        previousPriceRupees:
          item.previousPricePaise === null ? null : round2(item.previousPricePaise / 100),
      };
    }),
    spend: {
      thisMonthRupees: round2(stats.monthSpendPaise / 100),
      lastMonthRupees: round2(stats.previousMonthSpendPaise / 100),
    },
    rules: rules.map((rule) => ({
      type: rule.type,
      itemName: rule.itemName,
      message: rule.message,
      numbers: rule.numbers,
    })),
  };
}

/** Every number appearing in a piece of text, normalised to 2 decimals. */
export function numbersIn(text: string): string[] {
  return [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) =>
    String(round2(Number(match[0]))),
  );
}

function stripFences(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = (fenced ? fenced[1] : raw).trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

/**
 * Validate the model's reply and drop any suggestion whose message mentions a
 * number that is not present in the input summary (§F: "no invented numbers").
 */
export function parseAiReply(raw: string, summary: unknown): AiSuggestion[] | null {
  let data: unknown;
  try {
    data = JSON.parse(stripFences(raw));
  } catch {
    return null;
  }

  const parsed = aiReplySchema.safeParse(data);
  if (!parsed.success) return null;

  const allowed = new Set(numbersIn(JSON.stringify(summary)));
  return parsed.data.filter((suggestion) =>
    numbersIn(suggestion.message).every((number) => allowed.has(number)),
  );
}

export type AiResult = {
  suggestions: AiSuggestion[] | null;
  notice: string | null;
};

/** Ask the model; on any problem return `null` so the caller can fall back. */
export async function getAiSuggestions(
  stats: RuleStats,
  config: OllamaConfig,
  fetcher?: typeof fetch,
  chatImpl: typeof chat = chat,
): Promise<AiResult> {
  const rules = buildSuggestions(stats);
  const summary = buildSummary(stats, rules);

  try {
    const reply: ChatReply = await chatImpl(
      config,
      [
        { role: "system", content: AI_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(summary) },
      ],
      undefined,
      fetcher,
    );

    const suggestions = parseAiReply(reply.content, summary);
    if (!suggestions || suggestions.length === 0) {
      return { suggestions: null, notice: AI_UNAVAILABLE };
    }
    return { suggestions, notice: null };
  } catch {
    return { suggestions: null, notice: AI_UNAVAILABLE };
  }
}

/** Auto-refresh at most once per day. */
export function shouldAutoRefresh(lastAt: Date | null, now = new Date()): boolean {
  if (!lastAt) return true;
  return now.getTime() - lastAt.getTime() > 24 * 60 * 60 * 1000;
}
