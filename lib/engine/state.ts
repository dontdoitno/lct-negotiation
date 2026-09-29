import {
  ActionCode,
  Bucket,
  CBucket,
  CONSTRUCTIVE_ACTIONS,
  CONVERSATION_BREAKERS,
  IBucket,
  MetricCode,
  Persona,
  SBucket,
  SessionState,
} from "./types";

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function createInitialState(persona: Persona): SessionState {
  return {
    ...persona.initialState,
    turn: 0,
    revealedLayers: [],
    constructiveStreak: 0,
    highResistanceStreak: 0,
    postponeCount: 0,
    brokenOff: false,
  };
}

/**
 * Порог, с которого угроза увольнением обрывает разговор. Ниже него сотрудник
 * остаётся в разговоре, и угроза работает просто как дорогой ход.
 */
const BREAK_OFF_RESISTANCE = 85;

const POSTPONE_ACTIONS: ActionCode[] = ["postpone_with_deadline", "postpone_no_deadline"];

export interface TurnResult {
  state: SessionState;
  deltas: Partial<Record<MetricCode, number>>;
  revealed: { layer: number; text: string } | null;
}

/**
 * Pure, deterministic core: given the current state and a closed set of
 * classified player actions, compute the next state. No LLM call happens
 * here — this is the only place an outcome is decided.
 */
export function applyTurn(state: SessionState, actions: ActionCode[], persona: Persona): TurnResult {
  const before = { ...state };
  const next: SessionState = {
    ...state,
    revealedLayers: [...state.revealedLayers],
  };
  const totalDeltas: Partial<Record<MetricCode, number>> = {};

  for (const rawAction of actions) {
    // A second consecutive postponement is always treated as a repeat,
    // independent of the analyzer's own repeat detection — this keeps the
    // outcome reproducible even if the classifier misses the pattern.
    const isPostpone = POSTPONE_ACTIONS.includes(rawAction);
    const action: ActionCode =
      isPostpone && next.postponeCount >= 1 ? "postpone_repeat" : rawAction;

    const delta = persona.reactions[action] ?? {};
    for (const [metric, value] of Object.entries(delta) as [MetricCode, number][]) {
      next[metric] = clamp(next[metric] + value);
      totalDeltas[metric] = (totalDeltas[metric] ?? 0) + value;
    }

    if (persona.adaptiveActions.includes(action)) {
      next.A = clamp(next.A + 10);
      totalDeltas.A = (totalDeltas.A ?? 0) + 10;
    }
    if (persona.maladaptiveActions.includes(action)) {
      next.A = clamp(next.A - 10);
      totalDeltas.A = (totalDeltas.A ?? 0) - 10;
    }

    if (isPostpone || action === "postpone_repeat") {
      next.postponeCount += 1;
    } else if (action === "commit_fix") {
      next.postponeCount = 0;
    }

    next.constructiveStreak = CONSTRUCTIVE_ACTIONS.includes(action) ? next.constructiveStreak + 1 : 0;

    // Угроза увольнением обрывает разговор, если сотрудник к этому моменту уже
    // на максимальном сопротивлении. Проверяем после применения дельт: сама
    // угроза сопротивление и поднимает.
    if (CONVERSATION_BREAKERS.includes(action) && next.R >= BREAK_OFF_RESISTANCE) {
      next.brokenOff = true;
    }
  }

  // Progress metrics never regress within a session — once surfaced, never
  // "forgotten". C is the sole exception, handled by postpone_repeat above.
  next.I = Math.max(next.I, before.I);
  next.S = Math.max(next.S, before.S);

  next.turn = before.turn + 1;
  next.highResistanceStreak = next.R >= 90 ? next.highResistanceStreak + 1 : 0;

  const revealed = revealInterestIfReady(next, persona);

  return { state: next, deltas: totalDeltas, revealed };
}

const TRUST_THRESHOLDS_BY_LAYER_INDEX = [40, 55, 70, 85];

function revealInterestIfReady(
  state: SessionState,
  persona: Persona,
): { layer: number; text: string } | null {
  const revealCost = persona.layerRevealCost ?? 2;
  if (state.constructiveStreak < revealCost) return null;

  const nextLayerIndex = state.revealedLayers.length; // 0-based index of the next layer to reveal
  const layer = persona.hiddenInterests[nextLayerIndex];
  if (!layer) return null;

  const threshold = layer.trustThreshold ?? TRUST_THRESHOLDS_BY_LAYER_INDEX[nextLayerIndex] ?? 100;
  if (state.T < threshold) return null;

  state.revealedLayers.push(layer.layer);
  state.I = clamp(state.I + Math.round(100 / persona.hiddenInterests.length));
  state.constructiveStreak = 0;

  return { layer: layer.layer, text: layer.text };
}

export function bucketOf(metric: MetricCode, value: number): Bucket | IBucket | SBucket | CBucket {
  switch (metric) {
    case "R":
    case "T":
    case "A":
      return value >= 67 ? "high" : value >= 34 ? "medium" : "low";
    case "I":
      return value >= 67 ? "full" : value >= 34 ? "partial" : "none";
    case "S":
      return value >= 67 ? "several" : value >= 34 ? "one" : "none";
    case "C":
      return value >= 67 ? "done" : value >= 34 ? "partial" : "none";
  }
}
