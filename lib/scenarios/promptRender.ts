import { ACTION_CODES, ActionCode, MetricCode } from "@/lib/engine/types";
import { ACTION_BADGE } from "@/lib/flow/copy";
import { METRIC_META } from "@/lib/engine/labels";
import { TONE_PRESETS } from "./presets";
import {
  METRIC_LEVEL_LABEL,
  REACTION_LEVEL_LABEL,
  ScenarioDraft,
} from "./types";

/**
 * Подстановка полей сценария в шаблон промта. Здесь нет чтения файлов, поэтому
 * тот же код работает и на сервере, и в предпросмотре конструктора: шаблон
 * приходит аргументом.
 */

/** Порядок метрик в промте: сначала то, что меняется чаще. */
const METRIC_ORDER: MetricCode[] = ["R", "T", "I", "S", "C", "A"];

function bullets(items: string[]): string {
  return items.filter(Boolean).map((i) => `- ${i}`).join("\n");
}

function numbered(items: string[], startFrom: number): string {
  return items.filter(Boolean).map((item, i) => `${startFrom + i}. ${item}`).join("\n");
}

function renderHiddenLayers(scenario: ScenarioDraft): string {
  return scenario.hiddenLayers
    .map((layer, i) => `Слой ${i + 1}: «${layer.text}»`)
    .join("\n");
}

/**
 * Матрица реакций словами. Модель не должна считать числа, ей нужно понимать
 * направление: что собеседника успокаивает, а что заводит.
 */
function renderReactions(scenario: ScenarioDraft): string {
  const lines: string[] = [];
  for (const action of ACTION_CODES) {
    const row = scenario.reactions[action as ActionCode];
    if (!row) continue;
    const parts = METRIC_ORDER.filter((m) => row[m] && row[m] !== "none").map(
      (m) => `${METRIC_META[m].label} ${REACTION_LEVEL_LABEL[row[m]!]}`,
    );
    if (parts.length === 0) continue;
    const label = ACTION_BADGE[action] ?? action;
    lines.push(`- ${label} → ${parts.join(", ")}`);
  }
  return lines.join("\n");
}

function toneRules(scenario: ScenarioDraft): string[] {
  if (scenario.tone === "custom") return [];
  return TONE_PRESETS[scenario.tone].behaviorRules;
}

function resistanceScale(scenario: ScenarioDraft) {
  if (scenario.tone === "custom") {
    return {
      high: "Ты закрыт и не принимаешь аргументы.",
      medium: "Ты насторожен: слушаешь, но проверяешь.",
      low: "Ты открыт: обсуждаешь варианты и готов фиксировать договорённости.",
    };
  }
  return TONE_PRESETS[scenario.tone].resistanceScale;
}

const SLOTS: Record<string, (s: ScenarioDraft) => string> = {
  domain: (s) => s.domain,
  topic: (s) => s.topic,
  playerRole: (s) => s.playerRole,
  npcRole: (s) => s.npcRole,
  npcName: (s) => s.npcName,
  npcPosition: (s) => s.npcPosition,
  context: (s) => bullets(s.context),
  temperament: (s) => s.temperament,
  triggers: (s) => s.triggers.join(", ") || "не задано",
  soothers: (s) => s.soothers.join(", ") || "не задано",
  npcGoal: (s) => s.npcGoal,
  hiddenLayers: renderHiddenLayers,
  layerRevealCost: (s) => String(s.layerRevealCost),
  turnLimit: (s) => String(s.turnLimit),
  startR: (s) => METRIC_LEVEL_LABEL[s.startMetrics.R],
  startT: (s) => METRIC_LEVEL_LABEL[s.startMetrics.T],
  startI: (s) => METRIC_LEVEL_LABEL[s.startMetrics.I],
  startS: (s) => METRIC_LEVEL_LABEL[s.startMetrics.S],
  startC: (s) => METRIC_LEVEL_LABEL[s.startMetrics.C],
  startA: (s) => METRIC_LEVEL_LABEL[s.startMetrics.A],
  // Нумерация продолжает общие правила из шаблона, их там шесть.
  behaviorRules: (s) => numbered(toneRules(s), 7),
  resistanceHigh: (s) => resistanceScale(s).high,
  resistanceMedium: (s) => resistanceScale(s).medium,
  resistanceLow: (s) => resistanceScale(s).low,
  exitLine: (s) => s.exitLine,
  reactions: renderReactions,
  resources: (s) => bullets(s.resources),
  constraints: (s) => bullets(s.constraints),
};

/** Имена слотов — нужны предпросмотру, чтобы подсветить подставленные куски. */
export const PROMPT_SLOTS = Object.keys(SLOTS);

export function renderPrompt(template: string, scenario: ScenarioDraft): string {
  // Ручная правка выигрывает у конструктора: так написано в предупреждении,
  // которое видит администратор, включая режим customPrompt.
  if (scenario.customPrompt !== null && scenario.customPrompt.trim() !== "") {
    return scenario.customPrompt;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (match, slot: string) => {
    const render = SLOTS[slot];
    if (!render) return match;
    return render(scenario);
  });
}

/** Карта «слот → подставленное значение». Нужна предпросмотру в конструкторе. */
export function promptSlotValues(scenario: ScenarioDraft): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [slot, render] of Object.entries(SLOTS)) {
    values[slot] = render(scenario);
  }
  return values;
}
