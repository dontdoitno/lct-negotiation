import { bucketOf } from "../engine/state";
import { Ending, Persona, Scenario, SessionState } from "../engine/types";
import { getLLMProvider, isMockMode, Message } from "./provider";

export interface ActorTurnContext {
  persona: Persona;
  scenario: Scenario;
  state: SessionState;
  resistanceDelta: number; // positive = resistance grew this turn
  revealed: { layer: number; text: string } | null;
  ending: Ending;
  actionsHuman: string;
  history: { speaker: "player" | "npc"; text: string }[];
  turnIndex: number; // deterministic pick for mock lines
}

/**
 * Picks a line deterministically from `seed`, but (a) mixes in the current
 * R/T so consecutive turns in the same resistance bucket don't just cycle
 * turnIndex % length, and (b) skips the exact line that was said last turn
 * so mock mode never visibly repeats itself back-to-back.
 */
function pickVaried(list: string[], seed: number, avoidText?: string): string {
  if (list.length === 0) return "";
  let idx = seed % list.length;
  if (list.length > 1 && list[idx] === avoidText) {
    idx = (idx + 1) % list.length;
  }
  return list[idx];
}

function lastNpcLine(history: ActorTurnContext["history"]): string | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].speaker === "npc") return history[i].text;
  }
  return undefined;
}

export function buildActorSystemPrompt(ctx: ActorTurnContext): Message[] {
  const { persona, scenario, state } = ctx;
  const rBucket = bucketOf("R", state.R);
  const tBucket = bucketOf("T", state.T);
  const cBucket = bucketOf("C", state.C);
  const revealedList = state.revealedLayers.length
    ? persona.hiddenInterests
        .filter((l) => state.revealedLayers.includes(l.layer))
        .map((l) => l.text)
        .join("; ")
    : "ничего";

  const resourcesBlock =
    scenario.managerResources || scenario.managerConstraints
      ? `\nЧТО МОЖЕТ РУКОВОДИТЕЛЬ (не отвергай эти варианты как невозможные):\n${(scenario.managerResources ?? []).map((r) => `- ${r}`).join("\n")}\n\nЧЕГО РУКОВОДИТЕЛЬ НЕ МОЖЕТ (не проси и не жди этого от него):\n${(scenario.managerConstraints ?? []).map((c) => `- ${c}`).join("\n")}\n`
      : "";

  const system = `${persona.temperament}

БЭКСТОРИ: ${persona.backstory}
ТВОЯ ЦЕЛЬ: ${persona.goal}
ПРАВИЛА ПОВЕДЕНИЯ:
${persona.behaviorRules.map((r) => `- ${r}`).join("\n")}
${resourcesBlock}
Только реплика персонажа, 3–5 предложений, живой разговорный русский от первого лица. К руководителю обращайся на «вы». Естественная человеческая манера — избегай шаблонного «ИИ-тона», канцеляризмов и клише, чередуй короткие и длинные предложения. Не повторяй то, что уже говорил(а) — ссылайся на слова руководителя или добавляй новое. Реагируй на конкретные слова руководителя, а не общими фразами. Каждая реплика содержит одну зацепку: эмоцию, факт, требование или вопрос. Без пояснений, без метрик, без выхода из роли.`;

  // Разговор по инициативе руководителя: своей вступительной реплики у
  // сотрудника не было, поэтому контекст он вводит в первом же ответе —
  // этого требует первое правило поведения у всех персонажей.
  const isFirstNpcReply = !ctx.history.some((h) => h.speaker === "npc");
  const openingBlock =
    isFirstNpcReply && scenario.initiator === "manager" ? `${openingInstruction(persona)}\n\n` : "";

  const state_block = `${openingBlock}ТВОЁ ТЕКУЩЕЕ СОСТОЯНИЕ:
Сопротивление: ${rBucket}
Открытость: ${tBucket}
Уже раскрыто собеседнику: ${revealedList}
Договорённости: ${cBucket}

ЧТО ТОЛЬКО ЧТО СДЕЛАЛ РУКОВОДИТЕЛЬ: ${ctx.actionsHuman}
ТВОЯ РЕАКЦИЯ: сопротивление ${ctx.resistanceDelta > 0 ? "выросло" : ctx.resistanceDelta < 0 ? "упало" : "не изменилось"}

${ctx.revealed ? `В ЭТОЙ РЕПЛИКЕ раскрой: "${ctx.revealed.text}" — своими словами, не цитатой.\n` : ""}${
    ctx.ending === "failed" ? `ЗАВЕРШИ РАЗГОВОР в стиле: "${persona.exitLine}"\n` : ""
  }${ctx.ending === "success" ? "Предложи зафиксировать договорённости.\n" : ""}
ИСТОРИЯ РАЗГОВОРА:
${ctx.history
  .slice(-8)
  .map((h) => `${h.speaker === "player" ? "Руководитель" : persona.displayName}: ${h.text}`)
  .join("\n")}

ОРИЕНТИР ПО ТОНУ:
${persona.linesByResistance[rBucket as "high" | "medium" | "low"].join(" / ")}`;

  return [
    { role: "system", content: system },
    { role: "user", content: state_block },
  ];
}

/**
 * Инструкция для первой реплики. Текст из конструктора здесь ориентир по
 * смыслу, а не готовая фраза: администратор пишет «оправдывается за прогулы»,
 * и произнести это дословно персонаж не может.
 */
export function openingInstruction(persona: Persona): string {
  return `ЭТО ТВОЯ ПЕРВАЯ РЕПЛИКА. Поздоровайся на «вы» и введи собеседника в контекст: кто ты, в какой ты ситуации и чего хочешь. Закончи так, как предписывает твоё первое правило поведения.
О ЧЁМ ОНА ДОЛЖНА БЫТЬ (ориентир по смыслу, не цитата — перескажи своими словами, живой речью): "${persona.openingLine}"`;
}

/**
 * Первая реплика, сгенерированная моделью по ориентиру из конструктора.
 * Без модели возвращается сам ориентир: офлайн-режим должен оставаться
 * играбельным, пусть и с дословным текстом.
 */
export async function generateOpeningLine(persona: Persona, scenario: Scenario): Promise<string> {
  if (isMockMode()) return persona.openingLine;

  const messages = buildActorSystemPrompt({
    persona,
    scenario,
    state: { ...persona.initialState, turn: 0, revealedLayers: [], constructiveStreak: 0, highResistanceStreak: 0, postponeCount: 0 },
    resistanceDelta: 0,
    revealed: null,
    ending: null,
    actionsHuman: "разговор только начинается",
    history: [],
    turnIndex: 0,
  });
  messages[messages.length - 1].content = `${openingInstruction(persona)}\n\n${messages[messages.length - 1].content}`;

  try {
    const text = await getLLMProvider().complete(messages, { temperature: 0.8, maxTokens: 220 });
    const trimmed = text.trim();
    return trimmed.length > 0 && isValidReply(trimmed) ? trimmed : persona.openingLine;
  } catch (error) {
    console.error("[actor] не удалось сгенерировать первую реплику, берём ориентир дословно:", error);
    return persona.openingLine;
  }
}

const BANNED_PHRASES = ["как языковая модель", "как ии", "как искусственный интеллект"];

function isValidReply(text: string): boolean {
  if (text.length > 700) return false;
  const lower = text.toLowerCase();
  return !BANNED_PHRASES.some((p) => lower.includes(p));
}

export async function* streamActorReply(ctx: ActorTurnContext): AsyncGenerator<string, string> {
  if (isMockMode()) {
    const text = mockActorLine(ctx);
    yield text;
    return text;
  }

  const provider = getLLMProvider();
  const messages = buildActorSystemPrompt(ctx);

  for (let attempt = 0; attempt < 2; attempt++) {
    let full = "";
    try {
      for await (const chunk of provider.stream(messages, { temperature: 0.8, maxTokens: 220 })) {
        full += chunk;
        yield chunk;
      }
    } catch (err) {
      console.error(`[actor] LLM stream call failed (attempt ${attempt + 1}/2), falling back:`, err);
      full = "";
    }
    if (full.trim().length > 0 && !isValidReply(full)) {
      console.error(`[actor] LLM reply rejected by post-filter (attempt ${attempt + 1}/2):`, full);
    }
    if (isValidReply(full) && full.trim().length > 0) return full;
  }

  console.error("[actor] both LLM attempts failed or returned nothing usable — using a canned persona line.");
  const fallback = mockActorLine(ctx);
  yield fallback;
  return fallback;
}

function mockActorLine(ctx: ActorTurnContext): string {
  const { persona, scenario, state, ending } = ctx;

  if (ending === "failed") return persona.exitLine;
  // Когда разговор начинает руководитель, вступительная реплика сотрудника
  // ещё не звучала — отдаём её первым же ответом, как требует спецификация.
  const isFirstNpcReply = !ctx.history.some((h) => h.speaker === "npc");
  if (isFirstNpcReply && scenario.initiator === "manager") return persona.openingLine;
  if (ctx.turnIndex === 0 && ctx.history.length === 0) return persona.openingLine;

  const avoid = lastNpcLine(ctx.history);
  // Seed on turn index plus the live metrics so the pick moves even across
  // several turns that sit in the same resistance bucket, instead of just
  // cycling turnIndex % length.
  const seed = ctx.turnIndex * 31 + state.R * 7 + state.T * 3;

  if (ending === "success") return pickVaried(persona.linesByResistance.low, seed, avoid);
  if (ctx.revealed) return rephraseReveal(ctx.revealed.text, persona);

  const bucket = bucketOf("R", state.R) as "high" | "medium" | "low";
  return pickVaried(persona.linesByResistance[bucket], seed, avoid);
}

function rephraseReveal(text: string, persona: Persona): string {
  const prefixesByType: Record<Persona["type"], string[]> = {
    aggressive: ["Раз уж об этом зашла речь — ", "Ладно, скажу прямо: ", "Если честно: "],
    anxious: ["Если честно… ", "Может, не стоит, но… ", "Ладно, скажу как есть: "],
    rational: ["Раз мы про факты — ", "Если совсем прямо: ", "По сути дела: "],
  };
  const prefix = prefixesByType[persona.type][text.length % 3];
  return `${prefix}${text[0].toLowerCase()}${text.slice(1)}`;
}
