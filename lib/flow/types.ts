import { MetricCode } from "@/lib/engine/types";

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export type QuizRole = "teamlead" | "group_head" | "dept_head";
export type QuizTopic = "overload" | "performance_drop" | "just_practice";
export type QuizOutcome = "not_followed" | "conflict" | "went_silent";

export interface QuizAnswers {
  role?: QuizRole;
  topic?: QuizTopic;
  outcome?: QuizOutcome;
}

export type QuizQuestionId = "role" | "topic" | "outcome";

export interface QuizOption<V extends string> {
  value: V;
  label: string;
}

// ---------------------------------------------------------------------------
// Cases board
// ---------------------------------------------------------------------------

export type CaseTileState = "locked" | "available" | "completed" | "recommended";

export interface CaseTileData {
  levelId: string;
  /** Shown in place of the persona type: working out who you are talking to
      is part of the exercise, so the board only identifies the call. */
  callNumber: number;
  title: string;
  domain: string;
  topic: string;
  tone: "aggressive" | "anxious" | "rational" | "custom";
  difficulty: "easy" | "normal" | "hard";
  personaType: "rational" | "anxious" | "aggressive";
  displayName: string;
  attempts: number;
  /** Best result per metric across finished attempts; empty until one exists. */
  bestMetrics: Partial<Record<MetricCode, number>> | null;
  state: CaseTileState;
}

export interface NextStepSuggestion {
  levelId: string;
  /** Metric that scored worst on average — the reason this case is suggested. */
  weakestMetric: MetricCode;
  text: string;
}

// ---------------------------------------------------------------------------
// Commitments (fixation modal)
// ---------------------------------------------------------------------------

export interface CommitmentItem {
  id: string;
  what: string;
  who: string;
  deadline: string;
  check: string;
}

export type CommitmentVerdict = "accepted" | "revise" | "rejected";

export interface CommitmentReaction {
  verdict: CommitmentVerdict;
  /** In-character reply, rendered like a call line with the persona's avatar. */
  text: string;
  /** Index of the item the persona wants reworked, when verdict is "revise". */
  itemIndex?: number;
}

// ---------------------------------------------------------------------------
// Session end / debrief
// ---------------------------------------------------------------------------

export type EndReason = "committed" | "turn_limit" | "ai_left";

export interface TimelineTurn {
  index: number;
  speaker: "player" | "npc";
  text: string;
  /** Player turns only: action codes, rendered as human-language badges. */
  actions?: string[];
  deltas?: Partial<Record<MetricCode, number>>;
  /** Marks a pivot the debrief calls out on its own full-width row. */
  highlight?: { kind: "opened" | "lost"; text: string };
  /** Hidden-interest layer surfaced by this turn, if any. */
  revealedLayer?: number;
}

export interface HiddenLayerResult {
  layer: number;
  text: string;
  /** Turn index where the player reached it; null when never reached. */
  revealedAtTurn: number | null;
}

export interface WorkedItem {
  text: string;
  quote?: string;
}

export interface RewriteBlock {
  said: string;
  heard: string;
  couldBe: string;
}

export interface DebriefData {
  sessionId: string;
  levelId: string;
  scenarioId: string;
  scenarioTitle: string;
  personaType: "rational" | "anxious" | "aggressive";
  /** The reveal: shown only after the player has committed to a guess. */
  personaTypeLabel: string;
  displayName: string;
  endReason: EndReason;
  outcome: {
    goalAchievement: number;
    employeeSatisfaction: number;
    commitmentReadiness: number;
    conflictRisk: number;
  };
  verdict: string;
  metricsStart: Record<MetricCode, number>;
  metricsEnd: Record<MetricCode, number>;
  timeline: TimelineTurn[];
  layers: HiddenLayerResult[];
  worked: WorkedItem[];
  killed: WorkedItem[];
  /** Null hides the whole rewrite block. */
  rewrite: RewriteBlock | null;
  quizAnswers: QuizAnswers | null;
  /** Neighbouring persona in the same scenario, for "другой характер". */
  siblingLevelId: string | null;
}
