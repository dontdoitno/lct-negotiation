import { ActionCode, MetricCode } from "@/lib/engine/types";
import { AvatarId } from "./avatars";

/**
 * Сценарий как данные. Раньше ситуация и собеседник лежали в двух файлах
 * content/scenarios и content/personas; теперь это одна запись, которую
 * создаёт конструктор администратора. Шесть исходных уровней загружены
 * сидами через тот же конструктор.
 */

export type Tone = "aggressive" | "anxious" | "rational" | "custom";
export type ScenarioStatus = "draft" | "published";
export type DifficultyPreset = "easy" | "normal" | "hard";
/** Кто говорит первым. Подписи берутся из ролей, а не зашиты в код. */
export type Initiator = "npc" | "player";

/** Уровни метрики словами: администратор не вводит числа руками. */
export type MetricLevel = "low" | "medium" | "high";

/** Семь ступеней влияния действия на метрику, из них собирается матрица реакций. */
export type ReactionLevel =
  | "strong_down"
  | "down"
  | "slight_down"
  | "none"
  | "slight_up"
  | "up"
  | "strong_up";

export interface ResistanceLines {
  high: string[];
  medium: string[];
  low: string[];
}

export interface HiddenLayerInput {
  text: string;
}

export type StartMetrics = Record<MetricCode, MetricLevel>;

/** Пустые ячейки не хранятся: отсутствие метрики значит «не меняется». */
export type ReactionMatrix = Partial<Record<ActionCode, Partial<Record<MetricCode, ReactionLevel>>>>;

export interface ScenarioDefinition {
  id: string;
  title: string;

  // 1. Контекст
  domain: string;
  topic: string;
  playerRole: string;
  /** Роль собеседника в переговорах: сотрудник, покупатель, поставщик. */
  npcRole: string;
  context: string[];

  // 2. Собеседник
  npcName: string;
  npcPosition: string;
  /** Видео-аватар из /public/avatars. Пусто — круг с буквой. */
  avatar: AvatarId | null;
  tone: Tone;
  characterNote: string;
  temperament: string;
  triggers: string[];
  soothers: string[];
  npcGoal: string;
  initiator: Initiator;
  openingLine: string;
  exitLine: string;

  // 3. Скрытые интересы
  hiddenLayers: HiddenLayerInput[];
  /** Сколько конструктивных действий подряд раскрывают один слой, 1–5. */
  layerRevealCost: number;

  // 4. Цели игрока
  playerGoals: string[];
  successCriteria: string[];

  // 5. Ресурсы и ограничения
  resources: string[];
  constraints: string[];

  // 6. Сложность
  difficultyPreset: DifficultyPreset;
  startMetrics: StartMetrics;
  /** Точные значения поверх уровней. Что указано здесь, побеждает уровень. */
  startMetricsExact?: Partial<Record<MetricCode, number>> | null;
  turnLimit: number;
  /** Множитель дельт: насколько сильно действия игрока двигают метрики. */
  sensitivity: number;
  showTypeInBrief: boolean;
  trainingModeDefault: boolean;

  // 7. Реакции
  reactions: ReactionMatrix;

  /** Реплики офлайн-режима. В конструкторе не редактируются. */
  fallbackLines?: ResistanceLines | null;

  // 8. Промт
  /** Ручная правка. Пока не null, поля конструктора на промт не влияют. */
  customPrompt: string | null;

  status: ScenarioStatus;
  playthroughCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Черновик из конструктора: id и служебные поля появляются при сохранении. */
export type ScenarioDraft = Omit<
  ScenarioDefinition,
  "id" | "status" | "playthroughCount" | "createdAt" | "updatedAt"
>;

// ---------------------------------------------------------------------------
// Перевод уровней в числа. Единственное место, где слова становятся цифрами.
// ---------------------------------------------------------------------------

export const METRIC_LEVEL_VALUE: Record<MetricLevel, number> = {
  low: 15,
  medium: 50,
  high: 85,
};

export const REACTION_LEVEL_VALUE: Record<ReactionLevel, number> = {
  strong_down: -25,
  down: -15,
  slight_down: -8,
  none: 0,
  slight_up: 8,
  up: 15,
  strong_up: 25,
};

export const REACTION_LEVEL_LABEL: Record<ReactionLevel, string> = {
  strong_down: "сильно вниз",
  down: "вниз",
  slight_down: "слегка вниз",
  none: "без изменений",
  slight_up: "слегка вверх",
  up: "вверх",
  strong_up: "сильно вверх",
};

export const METRIC_LEVEL_LABEL: Record<MetricLevel, string> = {
  low: "низкое",
  medium: "среднее",
  high: "высокое",
};

/** Порядок ступеней для селектора: от самого негативного к самому позитивному. */
export const REACTION_LEVELS: ReactionLevel[] = [
  "strong_down",
  "down",
  "slight_down",
  "none",
  "slight_up",
  "up",
  "strong_up",
];

/** Ближайшая ступень к готовому числу. Нужен при переносе старого контента. */
export function reactionLevelFromValue(value: number): ReactionLevel {
  let best: ReactionLevel = "none";
  let bestDistance = Infinity;
  for (const level of REACTION_LEVELS) {
    const distance = Math.abs(REACTION_LEVEL_VALUE[level] - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = level;
    }
  }
  return best;
}

export function metricLevelFromValue(value: number): MetricLevel {
  if (value >= 67) return "high";
  if (value >= 34) return "medium";
  return "low";
}
