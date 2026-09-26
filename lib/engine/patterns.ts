import { ActionCode } from "./types";

export interface TurnLogEntry {
  actions: ActionCode[];
  npcResistanceBefore: number;
  npcResistanceAfter: number;
  personaType: "aggressive" | "anxious" | "rational";
  adaptivenessAfter: number;
}

export interface SessionOutcomeLog {
  personaType: "aggressive" | "anxious" | "rational";
  finalR: number;
  finalC: number;
  turns: TurnLogEntry[];
}

export interface PatternMatch {
  id: string;
  title: string;
}

const PATTERNS: { id: string; title: string; test: (sessions: SessionOutcomeLog[]) => boolean }[] = [
  {
    id: "breaks_under_pressure",
    title: "Ломается под давлением",
    test: (sessions) =>
      sessions.some((s) => {
        for (let i = 0; i < s.turns.length - 1; i++) {
          const a = s.turns[i];
          const b = s.turns[i + 1];
          if (a.npcResistanceBefore >= 67 && b.actions.includes("softness_no_substance")) return true;
        }
        return false;
      }),
  },
  {
    id: "ignores_emotion",
    title: "Не работает с эмоцией",
    test: (sessions) => {
      const all = sessions.flatMap((s) => s.turns);
      if (all.length === 0) return false;
      const ignored = all.filter((t) => t.actions.includes("ignore_emotion")).length;
      return ignored / all.length > 0.3;
    },
  },
  {
    id: "rushes_to_solution",
    title: "Торопится к решению",
    test: (sessions) =>
      sessions.some((s) => s.turns.some((t) => t.actions.includes("offer_options") && t.npcResistanceBefore >= 67)),
  },
  {
    id: "agrees_but_no_commitment",
    title: "Договаривается, но не фиксирует",
    test: (sessions) => sessions.some((s) => s.finalR < 34 && s.finalC < 50),
  },
  {
    id: "mirrors_aggression",
    title: "Зеркалит агрессию",
    test: (sessions) => sessions.some((s) => s.turns.some((t) => t.actions.includes("mirror_aggression"))),
  },
  {
    id: "soft_without_substance",
    title: "Мягкий без опоры",
    test: (sessions) =>
      sessions.some((s) => s.personaType === "aggressive" && s.turns.some((t) => t.adaptivenessAfter < 35)),
  },
  {
    id: "does_not_adapt",
    title: "Не адаптируется под характер",
    test: (sessions) => {
      const lowByType = new Map<string, boolean>();
      for (const s of sessions) {
        const low = s.turns.some((t) => t.adaptivenessAfter < 40);
        if (low) lowByType.set(s.personaType, true);
      }
      return lowByType.size >= 2;
    },
  },
];

export function detectPatterns(sessions: SessionOutcomeLog[]): PatternMatch[] {
  return PATTERNS.filter((p) => p.test(sessions)).map(({ id, title }) => ({ id, title }));
}
