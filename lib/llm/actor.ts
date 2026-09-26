import { bucketOf } from "../engine/state";
import { Ending, Persona, SessionState } from "../engine/types";
import { getLLMProvider, isMockMode, Message } from "./provider";

export interface ActorTurnContext {
  persona: Persona;
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
  const { persona, state } = ctx;
  const rBucket = bucketOf("R", state.R);
  const tBucket = bucketOf("T", state.T);
  const cBucket = bucketOf("C", state.C);
  const revealedList = state.revealedLayers.length
    ? persona.hiddenInterests
        .filter((l) => state.revealedLayers.includes(l.layer))
        .map((l) => l.text)
        .join("; ")
    : "ничего";

  const system = `${persona.temperament}

БЭКСТОРИ: ${persona.backstory}
ТВОЯ ЦЕЛЬ: ${persona.goal}
ПРАВИЛА ПОВЕДЕНИЯ:
${persona.behaviorRules.map((r) => `- ${r}`).join("\n")}

Только реплика персонажа, 1–3 предложения, живой разговорный русский. Без пояснений, без метрик, без выхода из роли.`;

  const state_block = `ТВОЁ ТЕКУЩЕЕ СОСТОЯНИЕ:
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

const BANNED_PHRASES = ["как языковая модель", "как ии", "как искусственный интеллект"];

function isValidReply(text: string): boolean {
  if (text.length > 400) return false;
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
  const { persona, state, ending } = ctx;

  if (ctx.turnIndex === 0 && ctx.history.length === 0) return persona.openingLine;
  if (ending === "failed") return persona.exitLine;

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
