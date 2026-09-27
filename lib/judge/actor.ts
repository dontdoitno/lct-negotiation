import { LLMClient } from "./llmClient";
import { loadPromptFile, renderTemplate } from "./prompts";
import { formatHistory, formatMetrics } from "./format";
import { HistoryTurn, JudgeCallResult, JudgeMetrics, PersonaType } from "./types";

export interface CallActorContext {
  personaType: PersonaType;
  scenarioContext: string;
  personaRole: string;
  managerResources?: string[];
  managerConstraints?: string[];
  metrics: JudgeMetrics;
  history: HistoryTurn[];
  judgeResult: JudgeCallResult;
}

function formatManagerResources(resources?: string[], constraints?: string[]): string {
  if (!resources?.length && !constraints?.length) return "";
  const parts: string[] = [];
  if (resources?.length) {
    parts.push(`Что может руководитель (не отвергай эти варианты как невозможные):\n${resources.map((r) => `- ${r}`).join("\n")}`);
  }
  if (constraints?.length) {
    parts.push(`Чего руководитель не может (не проси и не жди этого):\n${constraints.map((c) => `- ${c}`).join("\n")}`);
  }
  return parts.join("\n\n");
}

const ACTOR_TEMPERATURE = 0.7;
const ACTOR_MAX_TOKENS = 300;
const FALLBACK_REPLY: Record<PersonaType, string> = {
  rational: "Хорошо, дайте мне уточнить детали ещё раз.",
  anxious: "Извините… можно ещё раз, я не совсем поняла.",
  aggressive: "Так, и что дальше?",
};

function sanitizeReply(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_`#>]/g, "")
    .trim();
}

export async function callActor(client: LLMClient, ctx: CallActorContext): Promise<{ text: string; latencyMs: number }> {
  const template = loadPromptFile(`actor_${ctx.personaType}.md`);
  const prompt = renderTemplate(template, {
    scenario_context: ctx.scenarioContext,
    persona_role: ctx.personaRole,
    manager_resources: formatManagerResources(ctx.managerResources, ctx.managerConstraints),
    metrics: formatMetrics(ctx.metrics),
    judge_rationale: ctx.judgeResult.rationale,
    techniques_used: ctx.judgeResult.techniquesUsed.join(", ") || "нет",
    techniques_violated: ctx.judgeResult.techniquesViolated.join(", ") || "нет",
    history: formatHistory(ctx.history),
  });

  try {
    const res = await client.complete("actor", [{ role: "user", text: prompt }], {
      temperature: ACTOR_TEMPERATURE,
      maxTokens: ACTOR_MAX_TOKENS,
    });
    const text = sanitizeReply(res.text);
    return { text: text || FALLBACK_REPLY[ctx.personaType], latencyMs: res.latencyMs };
  } catch {
    return { text: FALLBACK_REPLY[ctx.personaType], latencyMs: 0 };
  }
}
