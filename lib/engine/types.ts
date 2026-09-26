export type MetricCode = "R" | "T" | "I" | "S" | "C" | "A";

export const ACTION_CODES = [
  "ack_emotion",
  "firm_respect",
  "open_question",
  "specific_recognition",
  "offer_options",
  "objective_criteria",
  "commit_fix",
  "apology",
  "postpone_with_deadline",
  "blame",
  "pressure",
  "ignore_emotion",
  "mirror_aggression",
  "direct_criticism",
  "softness_no_substance",
  "postpone_no_deadline",
  "postpone_repeat",
  "small_talk",
  "clarify_fact",
  "off_topic",
] as const;

export type ActionCode = (typeof ACTION_CODES)[number];

export const CONSTRUCTIVE_ACTIONS: ActionCode[] = [
  "ack_emotion",
  "firm_respect",
  "open_question",
  "specific_recognition",
  "offer_options",
  "objective_criteria",
  "commit_fix",
  "apology",
  "postpone_with_deadline",
];

export const DESTRUCTIVE_ACTIONS: ActionCode[] = [
  "blame",
  "pressure",
  "ignore_emotion",
  "mirror_aggression",
  "direct_criticism",
  "softness_no_substance",
  "postpone_no_deadline",
  "postpone_repeat",
];

export interface RawState {
  R: number;
  T: number;
  I: number;
  S: number;
  C: number;
  A: number;
}

export interface SessionState extends RawState {
  turn: number;
  revealedLayers: number[];
  constructiveStreak: number;
  highResistanceStreak: number;
  postponeCount: number;
}

export interface HiddenInterestLayer {
  layer: number;
  text: string;
  trustThreshold: number;
}

export type ReactionDelta = Partial<Record<MetricCode, number>>;

export interface Persona {
  id: string;
  scenarioId: string;
  type: "aggressive" | "anxious" | "rational";
  typeLabel: string;
  displayName: string;
  position: string;
  voice: string;
  temperament: string;
  backstory: string;
  goal: string;
  triggers?: string[];
  soothers?: string[];
  hiddenInterests: HiddenInterestLayer[];
  initialState: RawState;
  reactions: Partial<Record<ActionCode, ReactionDelta>>;
  adaptiveActions: ActionCode[];
  maladaptiveActions: ActionCode[];
  openingLine: string;
  behaviorRules: string[];
  linesByResistance: { high: string[]; medium: string[]; low: string[] };
  exitLine: string;
  hiddenFailure: boolean;
}

export interface PlayerGoal {
  id: string;
  text: string;
  metric: MetricCode;
  threshold: number;
  direction?: "above" | "below";
}

export interface Scenario {
  id: string;
  title: string;
  initiator: "employee" | "manager";
  playerRole: string;
  context: string;
  playerGoals: PlayerGoal[];
  turnLimit: number;
  personas: string[];
  config: { domain: string; difficulty: number; tone: string };
}

export type Ending = "success" | "failed" | "timeout" | null;

export type Bucket = "low" | "medium" | "high";
export type IBucket = "none" | "partial" | "full";
export type SBucket = "none" | "one" | "several";
export type CBucket = "none" | "partial" | "done";
