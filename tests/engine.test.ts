import { describe, expect, it } from "vitest";
import { applyTurn, createInitialState } from "@/lib/engine/state";
import { checkEnding } from "@/lib/engine/endings";
import aggressive from "@/content/personas/s1-aggressive.json";
import anxious from "@/content/personas/s1-anxious.json";
import rational from "@/content/personas/s1-rational.json";
import scenario from "@/content/scenarios/s1-overload.json";
import { Persona, Scenario } from "@/lib/engine/types";

const aggressivePersona = aggressive as unknown as Persona;
const anxiousPersona = anxious as unknown as Persona;
const rationalPersona = rational as unknown as Persona;
const s1 = scenario as unknown as Scenario;

describe("applyTurn — determinism", () => {
  it("produces the exact same output for the same input twice", () => {
    const state = createInitialState(aggressivePersona);
    const a = applyTurn(state, ["ack_emotion", "open_question"], aggressivePersona);
    const b = applyTurn(state, ["ack_emotion", "open_question"], aggressivePersona);
    expect(a.state).toEqual(b.state);
    expect(a.deltas).toEqual(b.deltas);
  });

  it("never lets the same action sequence produce a different resistance value", () => {
    let state = createInitialState(rationalPersona);
    for (let i = 0; i < 5; i++) {
      state = applyTurn(state, ["objective_criteria"], rationalPersona).state;
    }
    expect(state.R).toBe(0); // clamps at the floor, doesn't wobble
  });
});

describe("applyTurn — the three key asymmetries the psychologist wants provable", () => {
  it("specific_recognition hits anxious much harder than aggressive", () => {
    const anxiousDelta = applyTurn(createInitialState(anxiousPersona), ["specific_recognition"], anxiousPersona);
    const aggressiveDelta = applyTurn(createInitialState(aggressivePersona), ["specific_recognition"], aggressivePersona);
    expect(anxiousDelta.deltas.R).toBeLessThan(aggressiveDelta.deltas.R!);
  });

  it("softness_no_substance is neutral for anxious, but costs A for aggressive and raises R for rational", () => {
    const anxiousResult = applyTurn(createInitialState(anxiousPersona), ["softness_no_substance"], anxiousPersona);
    const aggressiveResult = applyTurn(createInitialState(aggressivePersona), ["softness_no_substance"], aggressivePersona);
    const rationalResult = applyTurn(createInitialState(rationalPersona), ["softness_no_substance"], rationalPersona);

    expect(anxiousResult.deltas.R ?? 0).toBe(0);
    expect(aggressiveResult.deltas.A).toBeLessThan(0);
    expect(rationalResult.deltas.R ?? 0).toBeGreaterThan(0);
  });

  it("objective_criteria helps rational the most", () => {
    const rationalResult = applyTurn(createInitialState(rationalPersona), ["objective_criteria"], rationalPersona);
    const aggressiveResult = applyTurn(createInitialState(aggressivePersona), ["objective_criteria"], aggressivePersona);
    expect(rationalResult.deltas.R!).toBeLessThan(aggressiveResult.deltas.R!);
  });
});

describe("progress metrics never regress", () => {
  it("I and S only go up even after a destructive turn", () => {
    let state = createInitialState(rationalPersona);
    state = applyTurn(state, ["objective_criteria", "offer_options"], rationalPersona).state;
    const iBefore = state.I;
    const sBefore = state.S;
    state = applyTurn(state, ["blame"], rationalPersona).state;
    expect(state.I).toBeGreaterThanOrEqual(iBefore);
    expect(state.S).toBeGreaterThanOrEqual(sBefore);
  });
});

describe("postpone_repeat auto-detection", () => {
  it("treats a second postponement as a repeat even if mislabeled by the analyzer", () => {
    let state = createInitialState(aggressivePersona);
    const first = applyTurn(state, ["postpone_with_deadline"], aggressivePersona);
    state = first.state;
    const second = applyTurn(state, ["postpone_with_deadline"], aggressivePersona);
    // postpone_repeat costs +25 R for aggressive, far more than a second +5
    expect(second.deltas.R).toBe(25);
  });

  it("resets the postpone streak after a commit_fix", () => {
    let state = createInitialState(aggressivePersona);
    state = applyTurn(state, ["postpone_with_deadline"], aggressivePersona).state;
    state = applyTurn(state, ["commit_fix"], aggressivePersona).state;
    const third = applyTurn(state, ["postpone_with_deadline"], aggressivePersona);
    expect(third.deltas.R).toBe(5);
  });
});

describe("hidden interest reveal", () => {
  it("only reveals a layer after 2+ constructive actions and enough trust", () => {
    const state = createInitialState(anxiousPersona);
    // one constructive action isn't enough even if trust is already high
    state.T = 90;
    const result = applyTurn(state, ["ack_emotion"], anxiousPersona);
    expect(result.revealed).toBeNull();
  });

  it("reveals layer 1 once streak and trust both clear the bar", () => {
    let state = createInitialState(anxiousPersona);
    state = applyTurn(state, ["specific_recognition"], anxiousPersona).state; // T: 40 -> 60
    const result = applyTurn(state, ["ack_emotion"], anxiousPersona); // streak=2, T>=40
    expect(result.revealed?.layer).toBe(1);
  });
});

describe("checkEnding", () => {
  it("declares success once R<34, C>=70, I>=70", () => {
    const state = { ...createInitialState(rationalPersona), R: 30, C: 75, I: 80, turn: 5 };
    expect(checkEnding(state, s1)).toBe("success");
  });

  it("declares failure after 3 consecutive high-resistance turns", () => {
    const state = { ...createInitialState(aggressivePersona), R: 95, highResistanceStreak: 3, turn: 6 };
    expect(checkEnding(state, s1)).toBe("failed");
  });

  it("declares timeout once the turn limit is reached", () => {
    const state = { ...createInitialState(rationalPersona), turn: 14 };
    expect(checkEnding(state, s1)).toBe("timeout");
  });

  it("returns null mid-conversation", () => {
    const state = { ...createInitialState(rationalPersona), turn: 3 };
    expect(checkEnding(state, s1)).toBeNull();
  });
});
