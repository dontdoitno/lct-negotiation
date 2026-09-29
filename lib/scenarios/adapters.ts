import {
  ActionCode,
  MetricCode,
  Persona,
  PlayerGoal,
  ReactionDelta,
  Scenario,
} from "@/lib/engine/types";
import { TONE_PRESETS } from "./presets";
import {
  METRIC_LEVEL_VALUE,
  REACTION_LEVEL_VALUE,
  ScenarioDefinition,
} from "./types";

/**
 * Сценарий из БД в типы движка.
 *
 * Движок и его тесты остались нетронутыми: вместо того чтобы учить их новой
 * модели данных, мы приводим новую модель к старым типам. Здесь же слова
 * превращаются в числа, а чувствительность — в множитель дельт.
 */

/** Пороги доверия по номеру слоя. При пяти слоях последний требует почти максимума. */
const TRUST_THRESHOLDS = [40, 55, 70, 85, 92];

/**
 * Метрики и пороги целей. Администратор задаёт цели словами, а чем их мерить,
 * решает система: иначе в конструкторе пришлось бы объяснять шкалы метрик.
 */
const GOAL_RUBRIC: { metric: MetricCode; threshold: number; direction?: "below" }[] = [
  { metric: "C", threshold: 70 },
  { metric: "R", threshold: 34, direction: "below" },
  { metric: "S", threshold: 60 },
  { metric: "I", threshold: 60 },
];

/** Уровень задаёт значение по умолчанию, точная настройка его переопределяет. */
function startState(def: ScenarioDefinition) {
  const exact = def.startMetricsExact ?? {};
  const metrics: MetricCode[] = ["R", "T", "I", "S", "C", "A"];
  const out = {} as Record<MetricCode, number>;
  for (const m of metrics) {
    out[m] = exact[m] ?? METRIC_LEVEL_VALUE[def.startMetrics[m]];
  }
  return out;
}

function scaleDelta(value: number, sensitivity: number): number {
  const scaled = Math.round(value * sensitivity);
  // Ненулевое влияние не должно схлопываться в ноль на низкой чувствительности:
  // иначе действие, которое психолог пометил значимым, перестаёт работать.
  if (value !== 0 && scaled === 0) return value > 0 ? 1 : -1;
  return scaled;
}

export function toPersona(def: ScenarioDefinition): Persona {
  const preset = def.tone === "custom" ? null : TONE_PRESETS[def.tone];

  const reactions: Partial<Record<ActionCode, ReactionDelta>> = {};
  for (const [action, row] of Object.entries(def.reactions)) {
    if (!row) continue;
    const delta: ReactionDelta = {};
    for (const [metric, level] of Object.entries(row)) {
      if (!level) continue;
      const value = REACTION_LEVEL_VALUE[level];
      if (value === 0) continue;
      delta[metric as MetricCode] = scaleDelta(value, def.sensitivity);
    }
    reactions[action as ActionCode] = delta;
  }

  const lines = (def.fallbackLines ?? preset?.fallbackLines) ?? {
    high: ["Мне сейчас трудно это обсуждать."],
    medium: ["Допустим. И что дальше?"],
    low: ["Хорошо, давайте разберёмся по порядку."],
  };

  return {
    id: def.id,
    scenarioId: def.id,
    // У движка три типа. Свой характер считаем рациональным: это влияет только
    // на подсказки подбора, поведение задаёт матрица реакций.
    type: def.tone === "custom" ? "rational" : def.tone,
    typeLabel: preset?.label ?? "Свой характер",
    displayName: def.npcName,
    position: def.npcPosition,
    avatar: def.avatar ?? undefined,
    voice: "alena",
    temperament: def.temperament,
    backstory: def.context.join(" "),
    goal: def.npcGoal,
    triggers: def.triggers,
    soothers: def.soothers,
    hiddenInterests: def.hiddenLayers.map((layer, i) => ({
      layer: i + 1,
      text: layer.text,
      trustThreshold: TRUST_THRESHOLDS[i] ?? 95,
    })),
    layerRevealCost: def.layerRevealCost,
    initialState: startState(def),
    reactions,
    adaptiveActions: preset?.adaptiveActions ?? [],
    maladaptiveActions: preset?.maladaptiveActions ?? [],
    openingLine: def.openingLine,
    behaviorRules: preset?.behaviorRules ?? [],
    linesByResistance: lines,
    exitLine: def.exitLine,
    hiddenFailure: false,
    behaviorNote: def.characterNote,
    trigger: def.context[def.context.length - 1],
  };
}

export function toScenario(def: ScenarioDefinition): Scenario {
  const playerGoals: PlayerGoal[] = def.playerGoals.map((text, i) => {
    const rubric = GOAL_RUBRIC[i % GOAL_RUBRIC.length];
    return {
      id: `g${i + 1}`,
      text,
      metric: rubric.metric,
      threshold: rubric.threshold,
      direction: rubric.direction,
    };
  });

  return {
    id: def.id,
    title: def.title,
    // Движок различает только «первым говорит собеседник» и «первым говорит
    // игрок», поэтому роли здесь схлопываются в прежние два значения.
    initiator: def.initiator === "npc" ? "employee" : "manager",
    playerRole: def.playerRole,
    context: def.context.join(" "),
    playerGoals,
    turnLimit: def.turnLimit,
    personas: [def.id],
    config: {
      domain: def.domain,
      difficulty: def.difficultyPreset === "hard" ? 4 : def.difficultyPreset === "easy" ? 2 : 3,
      tone: def.tone,
    },
    managerResources: def.resources,
    managerConstraints: def.constraints,
    playerRoleDescription: def.playerRole,
    successCriterion: def.successCriteria.join(" "),
  };
}
