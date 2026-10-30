import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

export type OllamaMode = "local" | "cloud";

export type OllamaConfig = {
  mode: OllamaMode;
  model: string;
  apiKey?: string | null;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type ToolCall = { name: string; arguments: Record<string, unknown> };

export type ChatReply = { content: string; toolCalls: ToolCall[] };

const TIMEOUT_MS = 60_000;

export function endpoint(mode: OllamaMode): string {
  return mode === "cloud"
    ? "https://ollama.com/api/chat"
    : "http://localhost:11434/api/chat";
}

/**
 * One non-streaming chat round-trip. Uses the Tauri HTTP plugin so the webview
 * is not blocked by CORS; the plugin scope only allows localhost:11434 and
 * ollama.com.
 */
export async function chat(
  config: OllamaConfig,
  messages: ChatMessage[],
  tools?: unknown[],
  fetcher: typeof fetch = tauriFetch as unknown as typeof fetch,
): Promise<ChatReply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetcher(endpoint(config.mode), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.mode === "cloud" && config.apiKey
          ? { authorization: `Bearer ${config.apiKey}` }
          : {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        ...(tools ? { tools } : {}),
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama replied ${response.status}`);
    }

    const data = (await response.json()) as {
      message?: { content?: string; tool_calls?: { function?: { name?: string; arguments?: unknown } }[] };
    };
    const message = data.message ?? {};
    const toolCalls: ToolCall[] = Array.isArray(message.tool_calls)
      ? message.tool_calls
          .map((call) => ({
            name: call.function?.name ?? "",
            arguments:
              typeof call.function?.arguments === "string"
                ? (JSON.parse(call.function.arguments) as Record<string, unknown>)
                : ((call.function?.arguments as Record<string, unknown>) ?? {}),
          }))
          .filter((call) => call.name)
      : [];

    return { content: String(message.content ?? ""), toolCalls };
  } finally {
    clearTimeout(timer);
  }
}
