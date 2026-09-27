import { LLMClient } from "./llmClient";
import { loadPromptFile, renderTemplate } from "./prompts";
import { formatHistory, formatMetrics } from "./format";
import { extractJson } from "./parseJson";
import { HistoryTurn, JudgeCallResult, JudgeMetrics, JudgeResultSchema, ZERO_DELTAS } from "./types";

export interface CallJudgeContext {
  metrics: JudgeMetrics;
  history: HistoryTurn[];
  text: string;
}

const JUDGE_TEMPERATURE = 0.1;
const JUDGE_MAX_TOKENS = 400;

export async function callJudge(client: LLMClient, ctx: CallJudgeContext): Promise<JudgeCallResult> {
  const rubric = loadPromptFile("rubric.md");
  const template = loadPromptFile("judge.md");
  const prompt = renderTemplate(template, {
    rubric,
    metrics: formatMetrics(ctx.metrics),
    history: formatHistory(ctx.history),
    text: ctx.text,
  });

  let lastError = "";
  let totalLatency = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    const messages = [
      { role: "user" as const, text: attempt === 0 ? prompt : `${prompt}\n\nВаш предыдущий ответ не был валидным JSON: ${lastError}\nВерните ТОЛЬКО валидный JSON строго по схеме, без markdown.` },
    ];

    try {
      const res = await client.complete("judge", messages, { temperature: JUDGE_TEMPERATURE, maxTokens: JUDGE_MAX_TOKENS });
      totalLatency += res.latencyMs;
      const parsed = JudgeResultSchema.parse(extractJson(res.text));
      return {
        deltas: parsed.deltas,
        techniquesUsed: parsed.techniques_used,
        techniquesViolated: parsed.techniques_violated,
        rationale: parsed.rationale,
        degraded: false,
        latencyMs: totalLatency,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    deltas: ZERO_DELTAS,
    techniquesUsed: [],
    techniquesViolated: [],
    rationale: `Не удалось получить корректную оценку от LLM (${lastError}).`,
    degraded: true,
    latencyMs: totalLatency,
  };
}
