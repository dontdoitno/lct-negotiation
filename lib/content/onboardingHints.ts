// In-call guided-practice copy, per negotiation-simulator-spec.md section 9.
// Hints are keyed by the turn number they should appear *before* (i.e. shown
// while the player is about to make that turn); they stop appearing after
// turn 7 regardless of training mode.

export const TURN_HINTS: Record<number, string> = {
  0: "Начните с того, чтобы понять его. Задайте открытый вопрос или назовите то, что видите.",
  3: "У него есть причины, о которых он ещё не сказал. Задавайте вопросы и следите за панелью «Скрытые интересы».",
  5: "Договорённость без конкретики не считается. Назовите, кто что делает и к какому сроку.",
};

export const HINTS_CUTOFF_TURN = 7;

export const OPENING_SUGGESTION_CHIPS = [
  "Я вижу, что вам сейчас непросто — расскажите, что происходит?",
  "Что именно сейчас мешает вам больше всего?",
  "Спасибо, что пришли поговорить об этом. Давайте разберёмся вместе.",
];

export function resistanceDeltaHint(rDelta: number): string {
  if (rDelta < 0) return "Смотрите — сопротивление упало. Вы попали в характер.";
  if (rDelta > 0) return "Сопротивление выросло — этот приём не сработал для этого типа характера.";
  return "Сопротивление не изменилось — попробуйте другой приём.";
}
