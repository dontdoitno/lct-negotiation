import { MetricCode } from "@/lib/engine/types";
import { QuizAnswers } from "./types";

export type PersonaType = "rational" | "anxious" | "aggressive";

const TOPIC_TO_SCENARIO: Record<string, string> = {
  overload: "s1-overload",
  performance_drop: "s3-performance-drop",
  just_practice: "s1-overload",
};

/**
 * What the player says usually goes wrong maps onto the character who makes
 * that failure mode most visible: a conflict-prone manager meets the one who
 * escalates, someone whose people go quiet meets the one who withdraws, and
 * "we agree but nothing happens" meets the one who insists on written terms.
 */
const OUTCOME_TO_TYPE: Record<string, PersonaType> = {
  conflict: "aggressive",
  went_silent: "anxious",
  not_followed: "rational",
};

/** Fallback order when the mapped type has no persona in that scenario. */
const TYPE_FALLBACK: PersonaType[] = ["rational", "anxious", "aggressive"];

/**
 * Picks the starting case from quiz answers. Pure: give it the answers and the
 * level ids that actually exist, get back one id. Never returns an id that is
 * not in `availableLevelIds`.
 */
export function matchLevelFromQuiz(answers: QuizAnswers, availableLevelIds: string[]): string {
  const scenarioId = TOPIC_TO_SCENARIO[answers.topic ?? "just_practice"] ?? "s1-overload";
  const prefix = scenarioId.split("-")[0];
  const inScenario = availableLevelIds.filter((id) => id.startsWith(`${prefix}-`));
  const pool = inScenario.length > 0 ? inScenario : availableLevelIds;

  const wanted = OUTCOME_TO_TYPE[answers.outcome ?? ""] ?? "rational";
  const order = [wanted, ...TYPE_FALLBACK.filter((t) => t !== wanted)];

  for (const type of order) {
    const hit = pool.find((id) => id.endsWith(`-${type}`));
    if (hit) return hit;
  }
  return pool[0] ?? availableLevelIds[0];
}

// ---------------------------------------------------------------------------
// Next-step recommendation, once the player has finished attempts
// ---------------------------------------------------------------------------

/** Metrics where a lower score is the better outcome. */
const LOWER_IS_BETTER: Partial<Record<MetricCode, true>> = { R: true };

/** How strongly each case trains each metric — used to pick what to suggest. */
const TRAINS: Record<PersonaType, MetricCode[]> = {
  rational: ["C", "S"],
  anxious: ["T", "I"],
  aggressive: ["R", "A"],
};

const METRIC_REASON: Record<MetricCode, string> = {
  C: "он сам требует фиксации",
  S: "с ним придётся перебирать варианты",
  T: "он откроется только при доверии",
  I: "его настоящую причину надо раскопать",
  R: "он сопротивляется в открытую",
  A: "он быстро считывает неподходящий подход",
};

const METRIC_NAME: Record<MetricCode, string> = {
  A: "A",
  T: "T",
  R: "R",
  I: "I",
  S: "S",
  C: "C",
};

export interface FinishedAttempt {
  levelId: string;
  metrics: Partial<Record<MetricCode, number>>;
}

/**
 * Finds the metric the player does worst on across finished attempts, then the
 * case that trains it. Returns null when there is nothing to go on.
 */
export function suggestNextStep(
  attempts: FinishedAttempt[],
  candidates: { levelId: string; personaType: PersonaType; scenarioTitle: string }[],
): { levelId: string; weakestMetric: MetricCode; text: string } | null {
  if (attempts.length === 0 || candidates.length === 0) return null;

  const all: MetricCode[] = ["A", "T", "R", "I", "S", "C"];
  let weakest: MetricCode | null = null;
  let weakestScore = Infinity;

  for (const m of all) {
    const values = attempts.map((a) => a.metrics[m]).filter((v): v is number => typeof v === "number");
    if (values.length === 0) continue;
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    // Normalise so "higher is worse" metrics compare on the same axis.
    const score = LOWER_IS_BETTER[m] ? 100 - avg : avg;
    if (score < weakestScore) {
      weakestScore = score;
      weakest = m;
    }
  }
  if (!weakest) return null;

  const pick =
    candidates.find((c) => TRAINS[c.personaType].includes(weakest as MetricCode)) ?? candidates[0];

  return {
    levelId: pick.levelId,
    weakestMetric: weakest,
    text: `У вас стабильно низкое ${METRIC_NAME[weakest]}. Возьмите «${pick.scenarioTitle}» с ${TYPE_DATIVE[pick.personaType]}: ${METRIC_REASON[weakest]}.`,
  };
}

const TYPE_DATIVE: Record<PersonaType, string> = {
  rational: "рациональным",
  anxious: "тревожным",
  aggressive: "агрессивным",
};
