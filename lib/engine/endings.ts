import { Ending, Scenario, SessionState } from "./types";

export function checkEnding(state: SessionState, scenario: Scenario): Ending {
  if (state.R < 34 && state.C >= 70 && state.I >= 70) return "success";
  // Обрыв разговора считается раньше победы по метрикам невозможен: угроза
  // увольнением поднимает сопротивление, а успех требует низкого.
  if (state.brokenOff) return "failed";
  // Сопротивление на максимуме: договариваться уже не с кем. Собеседник
  // произносит прощальную реплику и кладёт трубку, разговор проигран.
  if (state.R >= 100) return "failed";
  if (state.highResistanceStreak >= 3) return "failed";
  if (state.turn >= scenario.turnLimit) return "timeout";
  return null;
}
