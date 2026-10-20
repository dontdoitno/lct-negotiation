import { MetricCode } from "@/lib/engine/types";
import { DirectionId } from "@/lib/scenarios/directions";
import { QuizAnswers } from "./types";

export type PersonaType =
  | "rational"
  | "anxious"
  | "aggressive"
  | "manipulative"
  | "passive_aggressive"
  | "burnt_out"
  | "conformist";

/**
 * «С кем тяжелее договариваться» это и есть направление разговора. Для
 * начальства направление зависит от того, кто спрашивает: у руководителя
 * отдела следующий уровень это директор, у остальных непосредственный
 * начальник. Порядок в массиве и есть порядок предпочтения.
 */
function directionsFor(answers: QuizAnswers): DirectionId[] {
  switch (answers.counterpart) {
    case "peers":
      return ["peer"];
    case "boss":
      return answers.role === "dept_head" ? ["top", "up"] : ["up", "top"];
    case "subordinates":
      return ["down"];
    default:
      // Ответа нет: сотруднику ближе разговор наверх, руководителю вниз.
      return answers.role === "employee" ? ["up", "peer"] : ["down", "peer"];
  }
}

/**
 * Слова, по которым тема из опроса узнаётся в теме разговора. Совпадение
 * необязательное: оно только поднимает кандидата внутри уже выбранного
 * направления.
 */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  conflict: ["конфликт", "ответственн", "стык", "распределени"],
  boss_communication: ["срок", "зарплат", "решени", "бюджет", "срыв"],
  process_mess: ["перегруз", "нагрузк", "результат", "процесс", "дежурств", "задач"],
  just_practice: [],
};

export interface MatchCandidate {
  levelId: string;
  direction: DirectionId;
  topic: string;
  title: string;
}

/**
 * Подбирает первый разговор по ответам опроса.
 *
 * Сначала направление: с кем человеку тяжело, в ту сторону и разговор. Потом
 * тема, но только внутри выбранного направления. Функция чистая и никогда не
 * возвращает идентификатор, которого нет среди кандидатов.
 */
export function matchLevelFromQuiz(answers: QuizAnswers, candidates: MatchCandidate[]): string {
  if (candidates.length === 0) return "";

  const wanted = directionsFor(answers);
  let pool: MatchCandidate[] = [];
  for (const d of wanted) {
    pool = candidates.filter((c) => c.direction === d);
    if (pool.length > 0) break;
  }
  // Ни одного разговора в нужную сторону: роль могла закрыть направление
  // целиком, и тогда подбираем из того, что человеку вообще доступно.
  if (pool.length === 0) pool = candidates;

  const words = TOPIC_KEYWORDS[answers.topic ?? "just_practice"] ?? [];
  if (words.length > 0) {
    const hit = pool.find((c) => {
      const text = `${c.topic} ${c.title}`.toLowerCase();
      return words.some((w) => text.includes(w));
    });
    if (hit) return hit.levelId;
  }

  return pool[0].levelId;
}

// ---------------------------------------------------------------------------
// Next-step recommendation, once the player has finished attempts
// ---------------------------------------------------------------------------

/** Metrics where a lower score is the better outcome. */
const LOWER_IS_BETTER: Partial<Record<MetricCode, true>> = { R: true };

/** How strongly each case trains each metric — used to pick what to suggest. */
const TRAINS: Record<PersonaType, MetricCode[]> = {
  rational: ["C", "S"],
  anxious: ["T", "I"],
  aggressive: ["R", "A"],
  // Торгующийся наказывает за уступки без критериев и за размытые договорённости.
  manipulative: ["C", "A"],
  // Подтекст виден только тому, кто дошёл до настоящей причины.
  passive_aggressive: ["I", "T"],
  // Истощённому нужны доверие и хоть один выполнимый шаг.
  burnt_out: ["T", "S"],
  // За «мы считаем» прячется личный интерес, и его надо достать.
  conformist: ["I", "C"],
};

const METRIC_REASON: Record<MetricCode, string> = {
  C: "он сам требует фиксации",
  S: "с ним придётся перебирать варианты",
  T: "он откроется только при доверии",
  I: "его настоящую причину надо раскопать",
  R: "он сопротивляется в открытую",
  A: "он быстро считывает неподходящий подход",
};

const METRIC_NAME: Record<MetricCode, string> = {
  A: "A",
  T: "T",
  R: "R",
  I: "I",
  S: "S",
  C: "C",
};

export interface FinishedAttempt {
  levelId: string;
  metrics: Partial<Record<MetricCode, number>>;
}

/**
 * Finds the metric the player does worst on across finished attempts, then the
 * case that trains it. Returns null when there is nothing to go on.
 */
export function suggestNextStep(
  attempts: FinishedAttempt[],
  candidates: { levelId: string; personaType: PersonaType; scenarioTitle: string }[],
): { levelId: string; weakestMetric: MetricCode; text: string } | null {
  if (attempts.length === 0 || candidates.length === 0) return null;

  const all: MetricCode[] = ["A", "T", "R", "I", "S", "C"];
  let weakest: MetricCode | null = null;
  let weakestScore = Infinity;

  for (const m of all) {
    const values = attempts.map((a) => a.metrics[m]).filter((v): v is number => typeof v === "number");
    if (values.length === 0) continue;
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    // Normalise so "higher is worse" metrics compare on the same axis.
    const score = LOWER_IS_BETTER[m] ? 100 - avg : avg;
    if (score < weakestScore) {
      weakestScore = score;
      weakest = m;
    }
  }
  if (!weakest) return null;

  const pick =
    candidates.find((c) => TRAINS[c.personaType].includes(weakest as MetricCode)) ?? candidates[0];

  return {
    levelId: pick.levelId,
    weakestMetric: weakest,
    text: `У вас стабильно низкое ${METRIC_NAME[weakest]}. Возьмите «${pick.scenarioTitle}» с ${TYPE_DATIVE[pick.personaType]}: ${METRIC_REASON[weakest]}.`,
  };
}

const TYPE_DATIVE: Record<PersonaType, string> = {
  rational: "рациональным",
  anxious: "тревожным",
  aggressive: "агрессивным",
  manipulative: "манипулятивным",
  passive_aggressive: "пассивно-агрессивным",
  burnt_out: "выгоревшим",
  conformist: "конформистом",
};
