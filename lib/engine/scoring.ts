import { ActionCode, Ending, Persona, PlayerGoal, Scenario, SessionState } from "./types";
import { clamp } from "./state";

export interface OutcomeMetrics {
  goalAchievement: number; // 0..100 — доля выполненных playerGoals
  employeeSatisfaction: number; // (100-R)*0.4 + T*0.3 + I*0.3
  commitmentReadiness: number; // C*0.5 + T*0.3 + S*0.2
  conflictRisk: number; // R*0.5 + (100-T)*0.3 + (100-C)*0.2
}

export function goalProgress(state: SessionState, goal: PlayerGoal): number {
  const value = state[goal.metric];
  if (goal.direction === "below") {
    if (value <= goal.threshold) return 1;
    // linear falloff from 100 down to the threshold
    return clamp(1 - (value - goal.threshold) / (100 - goal.threshold), 0, 1);
  }
  return clamp(value / goal.threshold, 0, 1);
}

export function isGoalDone(state: SessionState, goal: PlayerGoal): boolean {
  const value = state[goal.metric];
  return goal.direction === "below" ? value <= goal.threshold : value >= goal.threshold;
}

export function computeOutcome(state: SessionState, scenario: Scenario): OutcomeMetrics {
  const doneCount = scenario.playerGoals.filter((g) => isGoalDone(state, g)).length;
  const goalAchievement = Math.round((doneCount / scenario.playerGoals.length) * 100);
  const employeeSatisfaction = Math.round((100 - state.R) * 0.4 + state.T * 0.3 + state.I * 0.3);
  const commitmentReadiness = Math.round(state.C * 0.5 + state.T * 0.3 + state.S * 0.2);
  const conflictRisk = Math.round(state.R * 0.5 + (100 - state.T) * 0.3 + (100 - state.C) * 0.2);
  return { goalAchievement, employeeSatisfaction, commitmentReadiness, conflictRisk };
}

export function isHiddenFailure(state: SessionState): boolean {
  return state.C >= 70 && state.T < 40;
}

export function computeStars(ending: Ending, state: SessionState, scenario: Scenario): number {
  if (ending !== "success") return 0;
  let stars = 1;
  const allGoalsDone = scenario.playerGoals.every((g) => isGoalDone(state, g));
  if (allGoalsDone) stars = 2;
  const allLayersRevealed = state.revealedLayers.length > 0;
  if (stars === 2 && allLayersRevealed && state.T >= 70) stars = 3;
  return stars;
}

const ACTION_POINTS: Partial<Record<ActionCode, number>> = {
  ack_emotion: 15,
  firm_respect: 15,
  open_question: 15,
  specific_recognition: 20,
  offer_options: 20,
  objective_criteria: 20,
  commit_fix: 30,
  apology: 10,
  postpone_with_deadline: 10,
  blame: -15,
  pressure: -15,
  ignore_emotion: -15,
  mirror_aggression: -25,
  direct_criticism: -15,
  softness_no_substance: -15,
  postpone_no_deadline: -15,
  postpone_repeat: -15,
};

export interface TurnScore {
  points: number;
  breakdown: string[];
}

export function scoreTurn(actions: ActionCode[], persona: Persona, revealedLayer: boolean): TurnScore {
  let points = 0;
  const breakdown: string[] = [];

  for (const action of actions) {
    const base = ACTION_POINTS[action] ?? 0;
    if (base !== 0) {
      points += base;
      breakdown.push(`${base > 0 ? "+" : ""}${base} ${action}`);
    }
    if (persona.adaptiveActions.includes(action)) {
      points += 15;
      breakdown.push("+15 попадание в характер");
    }
  }

  if (revealedLayer) {
    points += 50;
    breakdown.push("+50 раскрыт слой интересов");
  }

  return { points, breakdown };
}
