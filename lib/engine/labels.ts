import { bucketOf } from "./state";
import { MetricCode } from "./types";

export const METRIC_META: Record<MetricCode, { label: string; short: string; kind: "vital" | "pip"; color: "resistance" | "trust" | "adapt" | "insight" }> = {
  R: { label: "Сопротивление", short: "R", kind: "vital", color: "resistance" },
  T: { label: "Открытость", short: "T", kind: "vital", color: "trust" },
  A: { label: "Адаптивность", short: "A", kind: "vital", color: "adapt" },
  I: { label: "Ясность интересов", short: "I", kind: "pip", color: "insight" },
  S: { label: "Пространство решений", short: "S", kind: "pip", color: "insight" },
  C: { label: "Договорённости", short: "C", kind: "pip", color: "trust" },
};

const RU_BUCKET: Record<string, string> = {
  low: "низкое",
  medium: "среднее",
  high: "высокое",
  none: "нет",
  partial: "частично",
  full: "полностью",
  one: "один вариант",
  several: "несколько",
  done: "есть",
};

export function bucketLabel(metric: MetricCode, value: number): string {
  const bucket = bucketOf(metric, value) as string;
  return RU_BUCKET[bucket] ?? bucket;
}

export function pipCount(metric: MetricCode, value: number): number {
  const bucket = bucketOf(metric, value) as string;
  if (bucket === "none") return 0;
  if (bucket === "partial" || bucket === "one") return 1;
  return metric === "I" || metric === "S" ? 3 : 2;
}
