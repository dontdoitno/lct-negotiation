import { Ending, Scenario, SessionState } from "./types";

export function checkEnding(state: SessionState, scenario: Scenario): Ending {
  if (state.R < 34 && state.C >= 70 && state.I >= 70) return "success";
  if (state.highResistanceStreak >= 3) return "failed";
  if (state.turn >= scenario.turnLimit) return "timeout";
  return null;
}
