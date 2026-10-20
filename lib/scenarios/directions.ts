/**
 * Направление разговора: кто с кем говорит и у кого власть.
 *
 * Первая ось движка из `inner_docs/INTERACTION_MATRIX.md`. Именно по ней
 * каталог делится на категории: тема говорит, о чём разговор, а направление
 * о том, какие приёмы в нём вообще работают. На равном приказ не действует,
 * со старшим работают факты, с подчинённым рамка.
 *
 * `powerDistance` считается со стороны игрока: плюс значит игрок выше,
 * ноль равные, минус собеседник выше. Пока поле описательное: модификаторы
 * реакций по направлению ещё не реализованы.
 */

export type DirectionId = "down" | "up" | "peer" | "mediation" | "top";

export interface DirectionPreset {
  id: DirectionId;
  label: string;
  /** Короткая подпись под заголовком категории в каталоге. */
  hint: string;
  powerDistance: number;
  /** Приёмы гарвардского метода, которые работают в этом направлении. */
  techniques: string;
}

export const DIRECTION_PRESETS: Record<DirectionId, DirectionPreset> = {
  down: {
    id: "down",
    label: "Разговор с подчинённым",
    hint: "У вас есть власть. Собеседник зависит от вас и может скрывать проблему, соглашаясь формально.",
    powerDistance: 1,
    techniques: "Интересы вместо позиций, отделить человека от проблемы.",
  },
  up: {
    id: "up",
    label: "Разговор с руководителем",
    hint: "Власть у собеседника. Он может отказать и закончить разговор, приказ не работает.",
    powerDistance: -1,
    techniques: "Объективные критерии и своя альтернатива.",
  },
  peer: {
    id: "peer",
    label: "Разговор с равным",
    hint: "Приказать нельзя никому. Остаются интересы и варианты, выгодные обеим сторонам.",
    powerDistance: 0,
    techniques: "Интересы и варианты с взаимной выгодой.",
  },
  mediation: {
    id: "mediation",
    label: "Медиация",
    hint: "Две стороны конфликта, вы посредник. Каждая следит, не встали ли вы на сторону другой.",
    powerDistance: 1,
    techniques: "Отделить человека от проблемы, интересы обеих сторон.",
  },
  top: {
    id: "top",
    label: "Разговор с топ-уровнем",
    hint: "Мало времени, короткие реплики, нужны цифры. Длинные объяснения прерывают.",
    powerDistance: -2,
    techniques: "Объективные критерии.",
  },
};

/** Порядок в каталоге: от привычного руководителю к самому непривычному. */
export const DIRECTION_ORDER: DirectionId[] = ["down", "up", "peer", "mediation", "top"];

export const DIRECTION_OPTIONS = DIRECTION_ORDER.map((id) => ({
  value: id,
  label: DIRECTION_PRESETS[id].label,
}));

const IDS = new Set<string>(DIRECTION_ORDER);

export function isDirectionId(value: unknown): value is DirectionId {
  return typeof value === "string" && IDS.has(value);
}

/** Подписи из заготовок ситуаций («вниз», «вверх», «вбок») в идентификаторы. */
export const DIRECTION_BY_LABEL: Record<string, DirectionId> = {
  вниз: "down",
  вверх: "up",
  вбок: "peer",
  медиация: "mediation",
  топ: "top",
};
