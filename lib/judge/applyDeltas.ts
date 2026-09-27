import { JUDGE_METRICS, JudgeMetrics } from "./types";

export interface ApplyDeltasOptions {
  step: number; // multiplier applied to each -2..2 raw delta from the judge
  maxPerTurn: number; // hard cap on |applied change| per metric per turn
}

export interface ApplyDeltasResult {
  metrics: JudgeMetrics; // new 0..100 metrics
  applied: JudgeMetrics; // the actual (post-clamp) change per metric
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Pure function: current metrics + raw judge deltas (-2..2) -> next metrics.
 * The LLM only ever proposes small integer deltas; scaling and all bounds
 * enforcement happen here, never inside a prompt.
 */
export function applyDeltas(current: JudgeMetrics, rawDeltas: JudgeMetrics, opts: ApplyDeltasOptions): ApplyDeltasResult {
  const metrics = {} as JudgeMetrics;
  const applied = {} as JudgeMetrics;

  for (const metric of JUDGE_METRICS) {
    const scaled = clamp(rawDeltas[metric] * opts.step, -opts.maxPerTurn, opts.maxPerTurn);
    applied[metric] = scaled;
    metrics[metric] = clamp(current[metric] + scaled, 0, 100);
  }

  return { metrics, applied };
}

export interface FinishCheckOptions {
  turnLimit: number;
  commitmentSuccessThreshold: number;
  trustFailThreshold: number;
}

export type FinishStatus = "active" | "success" | "failed" | "timeout";

export function checkFinished(metrics: JudgeMetrics, turnCount: number, opts: FinishCheckOptions): FinishStatus {
  if (metrics.commitment >= opts.commitmentSuccessThreshold) return "success";
  if (metrics.trust <= opts.trustFailThreshold) return "failed";
  if (turnCount >= opts.turnLimit) return "timeout";
  return "active";
}
