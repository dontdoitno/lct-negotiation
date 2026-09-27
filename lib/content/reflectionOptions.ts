// Canonical hidden-interest categories per scenario, shared across all
// personas of that scenario since they sit on the same underlying situation.
export const MOTIVATION_OPTIONS_BY_SCENARIO: Record<string, readonly string[]> = {
  "s1-overload": [
    "Выгорание и усталость",
    "Потеря мотивации и смысла",
    "Личные обстоятельства",
    "Ощущение несправедливости: «Почему я делаю больше остальных?»",
  ],
  "s3-performance-drop": [
    "Неудобный график, который выматывает",
    "Напряжённая атмосфера в команде",
    "Недоплата — платят меньше, чем заслуживает",
    "Выгорание — нет сил и мотивации",
  ],
};

export const CORRECT_MOTIVATION_BY_PERSONA: Record<string, string> = {
  "s1-aggressive": "Ощущение несправедливости: «Почему я делаю больше остальных?»",
  "s1-anxious": "Выгорание и усталость",
  // Дмитрий's deepest layer ("физически не справляюсь... близок к выгоранию")
  // lands in the same bucket as anxious — that's what the psychologist's
  // spec actually says for this persona, not an artifact of picking distinct
  // buckets per type.
  "s1-rational": "Выгорание и усталость",
  // Both s3 personas' deepest (hardest to reach) layer is burnout-worded —
  // same pattern as above, not a bug.
  "s3-aggressive": "Выгорание — нет сил и мотивации",
  "s3-anxious": "Выгорание — нет сил и мотивации",
};

export function getMotivationOptions(scenarioId: string): readonly string[] {
  return MOTIVATION_OPTIONS_BY_SCENARIO[scenarioId] ?? MOTIVATION_OPTIONS_BY_SCENARIO["s1-overload"];
}

/** @deprecated kept for any lingering imports — prefer getMotivationOptions("s1-overload") */
export const S1_MOTIVATION_OPTIONS = MOTIVATION_OPTIONS_BY_SCENARIO["s1-overload"];
