export interface LLMMessage {
  role: "system" | "user";
  text: string;
}

export interface LLMCallOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface LLMCallResult {
  text: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
}

export interface LLMClient {
  complete(promptId: string, messages: LLMMessage[], opts?: LLMCallOptions): Promise<LLMCallResult>;
}

export interface LLMCallLogEntry {
  promptId: string;
  attempt: number;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  ok: boolean;
  error?: string;
  responsePreview?: string;
}

// Minimal structured logger — console-based on purpose (no observability
// stack needed for a hackathon-scale module); swap the sink here if you
// wire this into something like Sentry/Datadog later.
export function logLLMCall(entry: LLMCallLogEntry): void {
  console.log(`[judge-llm] ${JSON.stringify(entry)}`);
}

const DEFAULT_TIMEOUT_MS = Number(process.env.JUDGE_LLM_TIMEOUT_MS ?? 20000);
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_TRANSPORT_RETRIES = 2;
const BACKOFF_BASE_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const YANDEX_COMPLETION_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
// Third-party marketplace models (DeepSeek, Qwen, GPT-OSS) live on Yandex's
// OpenAI-compatible endpoint instead — see YANDEX_API_MODE below.
const YANDEX_RESPONSES_URL = "https://ai.api.cloud.yandex.net/v1/responses";
// DeepSeek et al. are reasoning models: they can spend the whole token
// budget on hidden reasoning and return no visible text if the cap is too
// low. Floor it well above what judge/actor normally request.
const YANDEX_REASONING_TOKEN_FLOOR = 1200;

function isResponsesMode(): boolean {
  return process.env.YANDEX_API_MODE === "responses";
}

export class YandexClient implements LLMClient {
  constructor(
    private apiKey: string,
    private folderId: string,
    private model = process.env.YANDEX_MODEL || "yandexgpt-lite",
    private modelVersion = process.env.YANDEX_MODEL_VERSION || "latest",
  ) {}

  private modelUri() {
    return `gpt://${this.folderId}/${this.model}/${this.modelVersion}`;
  }

  private requestBody(messages: LLMMessage[], opts: LLMCallOptions) {
    if (isResponsesMode()) {
      return JSON.stringify({
        model: this.modelUri(),
        temperature: opts.temperature ?? 0.5,
        instructions: messages
          .filter((m) => m.role === "system")
          .map((m) => m.text)
          .join("\n\n"),
        input: messages
          .filter((m) => m.role !== "system")
          .map((m) => m.text)
          .join("\n\n"),
        max_output_tokens: Math.max(opts.maxTokens ?? 300, YANDEX_REASONING_TOKEN_FLOOR),
      });
    }
    return JSON.stringify({
      modelUri: this.modelUri(),
      completionOptions: {
        stream: false,
        temperature: opts.temperature ?? 0.5,
        maxTokens: String(opts.maxTokens ?? 300),
      },
      messages: messages.map((m) => ({ role: m.role, text: m.text })),
    });
  }

  private headers() {
    return isResponsesMode()
      ? { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }
      : { Authorization: `Api-Key ${this.apiKey}`, "Content-Type": "application/json" };
  }

  private parseResponse(data: {
    result?: { alternatives?: { message: { text: string } }[]; usage?: { inputTextTokens?: string; completionTokens?: string } };
    output_text?: string;
    output?: { content?: { text?: string }[] | null }[];
    status?: string;
    incomplete_details?: { reason?: string };
  }): { text: string; promptTokens?: number; completionTokens?: number } {
    if (isResponsesMode()) {
      const text = data.output_text ?? (data.output ?? []).flatMap((i) => i.content ?? []).map((b) => b.text ?? "").join("");
      if (!text && data.status === "incomplete") {
        throw new Error(
          `Yandex Cloud (responses) incomplete: ${data.incomplete_details?.reason ?? "unknown"} — likely ran out of output tokens during reasoning.`,
        );
      }
      return { text };
    }
    const usage = data.result?.usage ?? {};
    return {
      text: data.result?.alternatives?.[0]?.message?.text ?? "",
      promptTokens: usage.inputTextTokens ? Number(usage.inputTextTokens) : undefined,
      completionTokens: usage.completionTokens ? Number(usage.completionTokens) : undefined,
    };
  }

  async complete(promptId: string, messages: LLMMessage[], opts: LLMCallOptions = {}): Promise<LLMCallResult> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const url = isResponsesMode() ? YANDEX_RESPONSES_URL : YANDEX_COMPLETION_URL;
    const body = this.requestBody(messages, opts);

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= MAX_TRANSPORT_RETRIES) {
      const started = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: this.headers(),
          body,
          signal: controller.signal,
        });
        clearTimeout(timer);
        const latencyMs = Date.now() - started;

        if (!res.ok) {
          const bodyText = await res.text().catch(() => "");
          if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_TRANSPORT_RETRIES) {
            logLLMCall({ promptId, attempt, latencyMs, ok: false, error: `HTTP ${res.status}: ${bodyText}` });
            await sleep(BACKOFF_BASE_MS * 2 ** attempt);
            attempt++;
            continue;
          }
          throw new Error(`Yandex Cloud error: ${res.status} ${bodyText}`);
        }

        const data = await res.json();
        const parsed = this.parseResponse(data);
        const result: LLMCallResult = { text: parsed.text, latencyMs, promptTokens: parsed.promptTokens, completionTokens: parsed.completionTokens };
        logLLMCall({
          promptId,
          attempt,
          latencyMs,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          ok: true,
          responsePreview: parsed.text.slice(0, 200),
        });
        return result;
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        const isAbort = err instanceof Error && err.name === "AbortError";
        if (!isAbort && attempt >= MAX_TRANSPORT_RETRIES) break;
        if (isAbort) break; // don't retry a timeout — it already waited timeoutMs once
        logLLMCall({ promptId, attempt, latencyMs: Date.now() - started, ok: false, error: String(err) });
        await sleep(BACKOFF_BASE_MS * 2 ** attempt);
        attempt++;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

/**
 * Deterministic client for tests and offline dev — no network. Branches on
 * promptId ("judge" | "actor") to return a shape appropriate to the caller.
 * Two magic markers let tests exercise the failure paths through the same
 * interface a real client would hit:
 *   "__FORCE_INVALID_JSON__" in the prompt -> returns malformed JSON once
 *   "__FORCE_ERROR__" in the prompt        -> throws (transport failure)
 */
export class MockClient implements LLMClient {
  async complete(promptId: string, messages: LLMMessage[]): Promise<LLMCallResult> {
    const combined = messages.map((m) => m.text).join("\n");

    if (combined.includes("__FORCE_ERROR__")) {
      throw new Error("mock transport failure");
    }
    if (combined.includes("__FORCE_INVALID_JSON__")) {
      return { text: "не json вообще", latencyMs: 5 };
    }

    if (promptId === "judge") {
      return {
        text: JSON.stringify({
          deltas: { adaptation: 1, trust: 1, resistance: -1, interests: 1, solutions: 0, commitment: 0 },
          techniques_used: ["focus_on_interests"],
          techniques_violated: [],
          rationale: "Мок-судья: реплика похожа на конструктивный открытый вопрос.",
        }),
        latencyMs: 5,
      };
    }

    return { text: "Хорошо, давайте посмотрим, что можно сделать.", latencyMs: 5 };
  }
}

export function getJudgeLLMClient(): LLMClient {
  const forced = process.env.JUDGE_LLM_CLIENT;
  if (forced === "mock") return new MockClient();
  if (forced === "yandex" || (process.env.YANDEX_API_KEY && process.env.YANDEX_FOLDER_ID)) {
    if (!process.env.YANDEX_API_KEY || !process.env.YANDEX_FOLDER_ID) {
      throw new Error("JUDGE_LLM_CLIENT=yandex requires YANDEX_API_KEY and YANDEX_FOLDER_ID");
    }
    return new YandexClient(process.env.YANDEX_API_KEY, process.env.YANDEX_FOLDER_ID);
  }
  return new MockClient();
}
