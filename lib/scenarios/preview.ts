import { ScenarioDraft, METRIC_LEVEL_VALUE } from "./types";
import { MetricCode } from "@/lib/engine/types";
import { splitContext } from "./adapters";
import { GENERATION_PRESETS } from "./generations";

/**
 * Что получится из черновика: отдельно то, что прочитает игрок, и отдельно то,
 * что он знать не должен.
 *
 * Вывод намеренно собирается теми же правилами, что и боевой адаптер: разбор
 * контекста берётся из `splitContext`, уровни метрик из того же словаря, пороги
 * доверия из того же ряда. Иначе превью со временем разойдётся с настоящим
 * брифингом, и доверять ему станет нельзя.
 */

/** Ряд порогов доверия по номеру слоя. Совпадает с рядом в адаптере. */
const TRUST_THRESHOLDS = [40, 55, 70, 85, 92];

const METRIC_ORDER: MetricCode[] = ["A", "T", "R", "I", "S", "C"];

export interface PlayerPreview {
  title: string;
  npcName: string;
  npcPosition: string;
  avatar: string | null;
  /** Поведенческая подсказка. Тип личности в ней не называется. */
  characterNote: string;
  situation: string;
  trigger?: string;
  playerRole: string;
  successCriteria: string[];
  constraints: string[];
  whoStarts: string;
}

export interface HiddenPreview {
  layers: { index: number; text: string; trustThreshold: number }[];
  layerRevealCost: number;
  startMetrics: { code: MetricCode; value: number }[];
  turnLimit: number;
  sensitivity: number;
  npcGoal: string;
  openingLineBrief: string;
  exitLine: string;
  /** Предыстория от второго лица: уходит в промт, в брифинг не попадает. */
  npcBackstory: string;
  /** Поколение: уточняет контекст в промте, игроку не показывается. */
  generation: string;
}

export function playerPreview(draft: ScenarioDraft): PlayerPreview {
  const { situation, trigger } = splitContext(draft.context);
  return {
    title: draft.title,
    npcName: draft.npcName,
    npcPosition: draft.npcPosition,
    avatar: draft.avatar,
    characterNote: draft.characterNote,
    situation,
    trigger,
    playerRole: draft.playerRole,
    successCriteria: draft.successCriteria.filter((s) => s.trim()),
    constraints: draft.constraints.filter((s) => s.trim()),
    whoStarts: draft.initiator === "npc" ? draft.npcRole : draft.playerRole,
  };
}

export function hiddenPreview(draft: ScenarioDraft): HiddenPreview {
  return {
    layers: draft.hiddenLayers
      .filter((l) => l.text.trim())
      .map((l, i) => ({
        index: i + 1,
        text: l.text,
        trustThreshold: TRUST_THRESHOLDS[i] ?? 95,
      })),
    layerRevealCost: draft.layerRevealCost,
    startMetrics: METRIC_ORDER.map((code) => ({
      code,
      // Точное число поверх уровня, ровно как в боевом адаптере.
      value: draft.startMetricsExact?.[code] ?? METRIC_LEVEL_VALUE[draft.startMetrics[code]],
    })),
    turnLimit: draft.turnLimit,
    sensitivity: draft.sensitivity,
    npcGoal: draft.npcGoal,
    openingLineBrief: draft.openingLine,
    exitLine: draft.exitLine,
    npcBackstory: draft.npcBackstory,
    generation: draft.generation ? GENERATION_PRESETS[draft.generation].label : "не задано",
  };
}
