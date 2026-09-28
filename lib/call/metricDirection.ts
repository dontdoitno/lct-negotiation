import { MetricCode } from "@/lib/engine/types";

/** Display order in the live panel. */
export const METRIC_ORDER: MetricCode[] = ["A", "T", "R", "I", "S", "C"];

/** Metrics where a decrease is progress toward the goal. */
const LOWER_IS_BETTER: Partial<Record<MetricCode, true>> = { R: true };

export function isLowerBetter(m: MetricCode) {
  return !!LOWER_IS_BETTER[m];
}

export function isFavorable(m: MetricCode, delta: number) {
  return isLowerBetter(m) ? delta < 0 : delta > 0;
}

/** A turn counts as positive when favorable movement outweighs unfavorable. */
export function turnIsPositive(deltas: Partial<Record<MetricCode, number>>) {
  let score = 0;
  for (const [m, d] of Object.entries(deltas) as [MetricCode, number][]) {
    if (!d) continue;
    score += isLowerBetter(m) ? -d : d;
  }
  return score >= 0;
}

export function formatDelta(d: number) {
  const v = Math.round(Math.abs(d));
  return d > 0 ? `▲ +${v}` : `▼ −${v}`;
}

export function nonZeroDeltas(deltas: Partial<Record<MetricCode, number>> | undefined) {
  if (!deltas) return [] as [MetricCode, number][];
  return METRIC_ORDER.filter((m) => !!deltas[m]).map((m) => [m, deltas[m] as number] as [MetricCode, number]);
}
