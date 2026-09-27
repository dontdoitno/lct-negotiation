import { z } from "zod";
import { MetricCode } from "@/lib/engine/types";

// English metric names per the judge-module spec. These are the same six
// metrics as the main engine's R/T/I/S/C/A — just spelled out — so we can
// reuse the psychologist-authored per-persona starting states instead of
// duplicating them under a second name.
export const JUDGE_METRICS = ["adaptation", "trust", "resistance", "interests", "solutions", "commitment"] as const;
export type JudgeMetric = (typeof JUDGE_METRICS)[number];
export type JudgeMetrics = Record<JudgeMetric, number>;

export const METRIC_TO_ENGINE_CODE: Record<JudgeMetric, MetricCode> = {
  adaptation: "A",
  trust: "T",
  resistance: "R",
  interests: "I",
  solutions: "S",
  commitment: "C",
};

export function engineStateToJudgeMetrics(state: Record<MetricCode, number>): JudgeMetrics {
  const out = {} as JudgeMetrics;
  for (const metric of JUDGE_METRICS) {
    out[metric] = state[METRIC_TO_ENGINE_CODE[metric]];
  }
  return out;
}

export const ZERO_DELTAS: JudgeMetrics = {
  adaptation: 0,
  trust: 0,
  resistance: 0,
  interests: 0,
  solutions: 0,
  commitment: 0,
};

export type PersonaType = "rational" | "anxious" | "aggressive";
export type ScenarioId = "s1-overload" | "s2-hard-task";

const judgeMetricShape = z.number().int().min(-2).max(2);

export const JudgeDeltaSchema = z.object({
  adaptation: judgeMetricShape,
  trust: judgeMetricShape,
  resistance: judgeMetricShape,
  interests: judgeMetricShape,
  solutions: judgeMetricShape,
  commitment: judgeMetricShape,
});

export const JudgeResultSchema = z.object({
  deltas: JudgeDeltaSchema,
  techniques_used: z.array(z.string()).default([]),
  techniques_violated: z.array(z.string()).default([]),
  rationale: z.string(),
});

export type JudgeResult = z.infer<typeof JudgeResultSchema>;

export interface JudgeCallResult {
  deltas: JudgeMetrics;
  techniquesUsed: string[];
  techniquesViolated: string[];
  rationale: string;
  degraded: boolean;
  latencyMs: number;
}

export interface HistoryTurn {
  playerText: string;
  npcReply: string;
}
