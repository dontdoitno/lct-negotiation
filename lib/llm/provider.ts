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

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

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
        model: OPENROUTER_MODEL,
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
        model: OPENROUTER_MODEL,
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

// ---------------------------------------------------------------------------
// Yandex Cloud Foundation Models (YandexGPT and friends).
// Docs: https://yandex.cloud/ru/docs/foundation-models/concepts/yandexgpt/models
// API:  https://yandex.cloud/ru/docs/foundation-models/text-generation/api-ref/TextGeneration/completion
// ---------------------------------------------------------------------------

const YANDEX_MODEL = process.env.YANDEX_MODEL || "yandexgpt-lite";
const YANDEX_MODEL_VERSION = process.env.YANDEX_MODEL_VERSION || "latest";
// Yandex Cloud has one endpoint for both modes — streaming is requested via
// completionOptions.stream in the body, not a separate path. (There is no
// "completionStream" route; that was a wrong guess and 404s.)
const YANDEX_COMPLETION_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";

interface YandexAlternative {
  message: { role: string; text: string };
  status: string;
}

interface YandexCompletionResponse {
  result?: { alternatives?: YandexAlternative[] };
}

class YandexCloudProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private folderId: string,
  ) {}

  private headers() {
    return {
      Authorization: `Api-Key ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private modelUri() {
    return `gpt://${this.folderId}/${YANDEX_MODEL}/${YANDEX_MODEL_VERSION}`;
  }

  private body(messages: Message[], opts: CompleteOptions, stream: boolean) {
    return {
      modelUri: this.modelUri(),
      completionOptions: {
        stream,
        temperature: opts.temperature ?? 0.6,
        maxTokens: String(opts.maxTokens ?? 300),
      },
      messages: messages.map((m) => ({ role: m.role, text: m.content })),
    };
  }

  async complete(messages: Message[], opts: CompleteOptions = {}): Promise<string> {
    const res = await fetch(YANDEX_COMPLETION_URL, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.body(messages, opts, false)),
    });
    if (!res.ok) throw new Error(`Yandex Cloud error: ${res.status} ${await res.text()}`);
    const data: YandexCompletionResponse = await res.json();
    return data.result?.alternatives?.[0]?.message?.text ?? "";
  }

  // Yandex's stream endpoint sends newline-delimited JSON where each line
  // carries the FULL text generated so far (not an incremental delta like
  // OpenAI-style SSE) — we diff against the previous line to yield chunks
  // in the same incremental shape the rest of the app expects.
  async *stream(messages: Message[], opts: CompleteOptions = {}): AsyncIterable<string> {
    const res = await fetch(YANDEX_COMPLETION_URL, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.body(messages, opts, true)),
    });
    if (!res.ok || !res.body) throw new Error(`Yandex Cloud error: ${res.status} ${await res.text().catch(() => "")}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let seenSoFar = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const json: YandexCompletionResponse = JSON.parse(trimmed);
          const full = json.result?.alternatives?.[0]?.message?.text ?? "";
          if (full.length > seenSoFar.length) {
            yield full.slice(seenSoFar.length);
            seenSoFar = full;
          }
        } catch {
          // ignore partial/non-JSON lines
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

type ProviderName = "yandex" | "openrouter" | "mock";

function hasYandexCreds(): boolean {
  return !!(process.env.YANDEX_API_KEY && process.env.YANDEX_FOLDER_ID);
}

function hasOpenRouterCreds(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

function resolveProviderName(): ProviderName {
  const forced = process.env.LLM_PROVIDER as ProviderName | undefined;
  if (forced === "yandex" || forced === "openrouter" || forced === "mock") return forced;

  if (process.env.MOCK_MODE === "true") return "mock";
  if (process.env.MOCK_MODE === "false" && !hasYandexCreds() && !hasOpenRouterCreds()) {
    // explicit opt-out of mock but nothing configured — fall through to the
    // auto-detected default below rather than silently staying in mock mode.
  }

  if (hasYandexCreds()) return "yandex";
  if (hasOpenRouterCreds()) return "openrouter";
  return "mock";
}

export function isMockMode(): boolean {
  return resolveProviderName() === "mock";
}

let cached: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cached) return cached;
  switch (resolveProviderName()) {
    case "yandex":
      cached = new YandexCloudProvider(process.env.YANDEX_API_KEY!, process.env.YANDEX_FOLDER_ID!);
      break;
    case "openrouter":
      cached = new OpenRouterProvider(process.env.OPENROUTER_API_KEY!);
      break;
    default:
      cached = new MockProvider();
  }
  return cached;
}
