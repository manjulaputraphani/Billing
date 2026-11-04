import type { Db } from "../db/client";
import { chat, type ChatMessage, type OllamaConfig } from "./ollama";
import { runTool, TOOLS } from "./tools";

const MAX_ROUNDS = 5;
const MAX_HISTORY = 10;

export const CHAT_SYSTEM_PROMPT = [
  "You are a read-only stock and expense assistant for a small shop in India.",
  "Use the tools to read data. You cannot change, add or delete anything.",
  "If asked to change or delete data, say you can only read data.",
  "Use ₹ and keep answers short.",
].join(" ");

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatAnswer = { answer: string; usedTools: string[] };

/**
 * Ask a question, letting the model call read-only tools (max 5 rounds).
 * Only the last 10 messages are sent, to keep the prompt small.
 */
export async function askAssistant(
  db: Db,
  config: OllamaConfig,
  history: ChatTurn[],
  question: string,
  chatImpl: typeof chat = chat,
): Promise<ChatAnswer> {
  const messages: ChatMessage[] = [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    ...history.slice(-MAX_HISTORY).map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
    { role: "user", content: question },
  ];

  const usedTools: string[] = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const reply = await chatImpl(config, messages, TOOLS as unknown as unknown[]);

    if (reply.toolCalls.length === 0) {
      return {
        answer: reply.content || "I could not find an answer in your data.",
        usedTools,
      };
    }

    if (reply.content) {
      messages.push({ role: "assistant", content: reply.content });
    }

    for (const call of reply.toolCalls) {
      usedTools.push(call.name);
      let result: unknown;
      try {
        result = await runTool(db, call.name, call.arguments);
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) };
      }
      messages.push({ role: "tool", content: JSON.stringify(result) });
    }
  }

  // The model never stopped calling tools — ask once more WITHOUT tools so it must answer.
  const final = await chatImpl(
    config,
    [...messages, { role: "user", content: "Answer now using what you found." }],
    undefined,
  );
  return {
    answer: final.content || "I could not find an answer in your data.",
    usedTools,
  };
}
