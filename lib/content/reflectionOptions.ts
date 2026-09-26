// The four canonical hidden-interest categories from the psychologist's brief
// for "Перегрузка сотрудника" — shared across all three personas of the
// scenario, since they all sit on the same underlying situation.
export const S1_MOTIVATION_OPTIONS = [
  "Выгорание и усталость",
  "Потеря мотивации и смысла",
  "Личные обстоятельства",
  "Ощущение несправедливости: «Почему я делаю больше остальных?»",
] as const;

export const CORRECT_MOTIVATION_BY_PERSONA: Record<string, string> = {
  "s1-aggressive": "Ощущение несправедливости: «Почему я делаю больше остальных?»",
  "s1-anxious": "Выгорание и усталость",
  // Дмитрий's deepest layer ("физически не справляюсь... близок к выгоранию")
  // lands in the same bucket as anxious — that's what the psychologist's
  // spec actually says for this persona, not an artifact of picking distinct
  // buckets per type.
  "s1-rational": "Выгорание и усталость",
};
