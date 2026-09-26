import { ActionCode } from "./types";

export interface TurnForRecommendation {
  actions: ActionCode[];
  deltas: Partial<Record<"R", number>>;
  index: number;
}

interface Rule {
  test: (turns: TurnForRecommendation[], finalR: number, finalC: number, finalT: number) => boolean;
  text: string;
}

const RULES: Rule[] = [
  {
    test: (turns) => turns.some((t) => t.actions.includes("mirror_aggression")),
    text: "Вы хотя бы раз ответили резкостью на резкость — именно в эти моменты сопротивление подскакивало сильнее всего. Попробуйте сначала назвать эмоцию, а уже потом говорить по существу.",
  },
  {
    test: (turns) => {
      const ignored = turns.filter((t) => t.actions.includes("ignore_emotion")).length;
      return turns.length > 0 && ignored / turns.length > 0.3;
    },
    text: "Вы часто переводили разговор на факты, пропуская то, что человек говорил о своём состоянии. Сначала — признание чувства, потом — аргумент.",
  },
  {
    test: (turns) => turns.some((t) => t.actions.includes("postpone_repeat")),
    text: "Повторное «я подумаю» без изменений считывается как отказ. Если нужна пауза — называйте точный срок и что будет после него.",
  },
  {
    test: (_turns, finalR, finalC) => finalR < 34 && finalC < 50,
    text: "Вы сняли напряжение, но не зафиксировали конкретику — кто, что и к какому сроку. Без этого договорённость легко забывается.",
  },
  {
    test: (_turns, finalR, finalC, finalT) => finalC >= 70 && finalT < 40,
    text: "Согласие есть, но доверия нет. Такое «да» обычно означает, что человек согласился, чтобы разговор закончился, а не потому что поверил.",
  },
  {
    test: (turns) => turns.some((t) => t.actions.includes("softness_no_substance")),
    text: "Вы несколько раз успокаивали, не предлагая ничего конкретного. Это снимает напряжение на секунду, но не двигает разговор вперёд.",
  },
];

const FALLBACK = [
  "Вы удержали баланс твёрдости и внимания к человеку — это основа методики. Проверьте, зафиксированы ли договорённости с конкретными сроками.",
  "Попробуйте в следующий раз задавать открытые вопросы раньше, чем предлагать варианты решения — это открывает больше скрытых интересов.",
];

export function buildRecommendations(
  turns: TurnForRecommendation[],
  finalR: number,
  finalC: number,
  finalT: number,
): string[] {
  const matched = RULES.filter((r) => r.test(turns, finalR, finalC, finalT)).map((r) => r.text);
  const result = [...matched];
  let i = 0;
  while (result.length < 2 && i < FALLBACK.length) {
    if (!result.includes(FALLBACK[i])) result.push(FALLBACK[i]);
    i++;
  }
  return result.slice(0, 2);
}

export function findBreakpoints(turns: TurnForRecommendation[], max = 3): number[] {
  return [...turns]
    .filter((t) => (t.deltas.R ?? 0) !== 0)
    .sort((a, b) => Math.abs(b.deltas.R ?? 0) - Math.abs(a.deltas.R ?? 0))
    .slice(0, max)
    .map((t) => t.index)
    .sort((a, b) => a - b);
}
