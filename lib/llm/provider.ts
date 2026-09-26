export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompleteOptions {
  schema?: object;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  complete(messages: Message[], opts?: CompleteOptions): Promise<string>;
  stream(messages: Message[], opts?: CompleteOptions): AsyncIterable<string>;
}

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

class OpenRouterProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async complete(messages: Message[], opts: CompleteOptions = {}): Promise<string> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature: opts.temperature ?? 0,
        max_tokens: opts.maxTokens ?? 300,
        ...(opts.schema ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  async *stream(messages: Message[], opts: CompleteOptions = {}): AsyncIterable<string> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature: opts.temperature ?? 0.8,
        max_tokens: opts.maxTokens ?? 300,
        stream: true,
      }),
    });
    if (!res.ok || !res.body) throw new Error(`OpenRouter error: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta as string;
        } catch {
          // ignore partial/non-JSON keep-alive lines
        }
      }
    }
  }
}

/**
 * Deterministic stand-in for offline demos and local dev without API keys.
 * Callers (analyzer/actor) supply their own mock logic on top of this —
 * this class only guarantees the interface never throws.
 */
class MockProvider implements LLMProvider {
  async complete(): Promise<string> {
    return "{}";
  }

  async *stream(): AsyncIterable<string> {
    yield "";
  }
}

let cached: LLMProvider | null = null;

export function isMockMode(): boolean {
  if (process.env.MOCK_MODE === "false") return false;
  if (process.env.MOCK_MODE === "true") return true;
  return !process.env.OPENROUTER_API_KEY;
}

export function getLLMProvider(): LLMProvider {
  if (cached) return cached;
  cached = isMockMode() ? new MockProvider() : new OpenRouterProvider(process.env.OPENROUTER_API_KEY!);
  return cached;
}
