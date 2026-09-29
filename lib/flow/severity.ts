import { DifficultyPreset } from "@/lib/scenarios/types";
import { MetricCode } from "@/lib/engine/types";
import { isLowerBetter } from "@/lib/call/metricDirection";

/**
 * Три ступени «спокойно — настороженно — плохо» и один набор цветов на них.
 *
 * Цвета берём из метрик разговора: зелёный доверия, янтарный интересов,
 * красный сопротивления. Они приглушённые и уже проверены на контраст, поэтому
 * чип сложности на карточке и шкала метрики читаются как одна система, а не как
 * два разных светофора.
 */
export type Severity = "calm" | "watch" | "alarm";

export const SEVERITY_CLASS: Record<Severity, { text: string; bar: string; chip: string }> = {
  calm: {
    text: "text-metric-trust",
    bar: "bg-metric-trust",
    chip: "border-metric-trust/35 bg-trust-soft text-metric-trust",
  },
  watch: {
    text: "text-metric-insight",
    bar: "bg-metric-insight",
    chip: "border-metric-insight/35 bg-insight-soft text-metric-insight",
  },
  alarm: {
    text: "text-metric-resistance",
    bar: "bg-metric-resistance",
    chip: "border-metric-resistance/35 bg-resistance-soft text-metric-resistance",
  },
};

/** Сложность кейса: простая зелёная, обычная жёлтая, сложная красная. */
export function severityOfDifficulty(difficulty: DifficultyPreset): Severity {
  if (difficulty === "easy") return "calm";
  if (difficulty === "normal") return "watch";
  return "alarm";
}

/**
 * Метрика разговора по её текущему значению. Считаем не само число, а то,
 * насколько оно в вашу пользу: у сопротивления хорошая сторона снизу, у
 * остальных сверху, поэтому шкалу сначала разворачиваем.
 */
export function severityOfMetric(metric: MetricCode, value: number): Severity {
  const favorable = isLowerBetter(metric) ? 100 - value : value;
  if (favorable >= 67) return "calm";
  if (favorable >= 34) return "watch";
  return "alarm";
}
