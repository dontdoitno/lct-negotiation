import { ActionCode } from "@/lib/engine/types";

export const ACTION_LABELS: Partial<Record<ActionCode, string>> = {
  ack_emotion: "Признание эмоции",
  firm_respect: "Твёрдость с уважением",
  open_question: "Открытый вопрос",
  specific_recognition: "Конкретное признание работы",
  offer_options: "Предложение вариантов",
  objective_criteria: "Опора на объективные критерии",
  commit_fix: "Фиксация договорённости",
  apology: "Признание своей ошибки",
  postpone_with_deadline: "«Я подумаю» со сроком",
  blame: "Обвинение",
  pressure: "Давление",
  ignore_emotion: "Игнорирование эмоции",
  mirror_aggression: "Зеркалирование агрессии",
  direct_criticism: "Прямая критика без опоры",
  raise_voice: "Повышение голоса",
  threat_of_firing: "Угроза увольнением",
  softness_no_substance: "Мягкость без конкретики",
  postpone_no_deadline: "«Я подумаю» без срока",
  postpone_repeat: "Повторное «я подумаю»",
};

export interface TaxonomyEntry {
  code: ActionCode;
  what: string;
}

export const CONSTRUCTIVE_ENTRIES: TaxonomyEntry[] = [
  { code: "ack_emotion", what: "Называете вслух состояние собеседника — «вижу, ты на взводе»." },
  { code: "firm_respect", what: "Держите позицию, но без обесценивания." },
  { code: "open_question", what: "Спрашиваете открыто, не начиная с «ты не...»." },
  { code: "specific_recognition", what: "Признаёте конкретный вклад, а не хвалите в общих словах." },
  { code: "offer_options", what: "Предлагаете варианты, а не одно готовое решение." },
  { code: "objective_criteria", what: "Опираетесь на данные, нагрузку команды, правила." },
  { code: "commit_fix", what: "Фиксируете договорённость с именами и сроками." },
  { code: "apology", what: "Признаёте свою ошибку." },
  { code: "postpone_with_deadline", what: "Откладываете решение, но называете конкретный срок." },
];

export const DESTRUCTIVE_ENTRIES: TaxonomyEntry[] = [
  { code: "blame", what: "Обвиняете собеседника." },
  { code: "pressure", what: "Давите, требуете, ссылаетесь на власть." },
  { code: "ignore_emotion", what: "Переводите на факты, проигнорировав то, что человек только что сказал о своём состоянии." },
  { code: "mirror_aggression", what: "Отвечаете на резкость резкостью." },
  { code: "direct_criticism", what: "Критикуете работу без опоры на факты." },
  { code: "raise_voice", what: "Повышаете голос: крик, капслок, частокол восклицательных знаков." },
  { code: "threat_of_firing", what: "Угрожаете увольнением. На высоком сопротивлении разговор на этом обрывается." },
  { code: "softness_no_substance", what: "Успокаиваете, не предлагая ничего конкретного." },
  { code: "postpone_no_deadline", what: "«Я подумаю» без срока." },
  { code: "postpone_repeat", what: "Второй раз откладываете решение — это уже читается как отказ." },
];

export interface QuizItem {
  id: string;
  line: string;
  context?: string;
  correct: ActionCode;
  options: ActionCode[];
  explanation: string;
}

export const QUIZ_ITEMS: QuizItem[] = [
  {
    id: "q1",
    context: "Сотрудник только что сказал, что не справляется с нагрузкой.",
    line: "«Я вижу, что тебе сейчас тяжело — это заметно».",
    correct: "ack_emotion",
    options: ["ack_emotion", "specific_recognition", "ignore_emotion", "softness_no_substance"],
    explanation:
      "Это признание эмоции: вы называете вслух состояние собеседника, не переходя пока к решению. Это почти всегда снижает сопротивление, потому что человека наконец услышали.",
  },
  {
    id: "q2",
    context: "Сотрудник жалуется, что один за всех работает.",
    line: "«Все сейчас работают в таком режиме, не только ты».",
    correct: "ignore_emotion",
    options: ["ignore_emotion", "firm_respect", "objective_criteria", "open_question"],
    explanation:
      "Формально это звучит как факт, но по сути — игнорирование эмоции: вы перевели разговор на сравнение с другими, не отреагировав на то, что человек только что сказал о себе. Сопротивление после такой реплики почти всегда растёт.",
  },
  {
    id: "q3",
    context: "Руководитель хочет предметно обсудить нагрузку.",
    line: "«По данным нагрузка выросла примерно на треть — давайте посмотрим, что можно снять».",
    correct: "objective_criteria",
    options: ["objective_criteria", "pressure", "offer_options", "commit_fix"],
    explanation:
      "Опора на данные и цифры вместо мнений — это objective_criteria. Особенно сильно работает на рациональном типе: цифры убеждают того, кто мыслит цифрами.",
  },
  {
    id: "q4",
    context: "Руководитель хочет снять напряжение, не предлагая ничего конкретного.",
    line: "«Не переживай, всё как-нибудь наладится, я разберусь».",
    correct: "softness_no_substance",
    options: ["softness_no_substance", "ack_emotion", "apology", "postpone_with_deadline"],
    explanation:
      "Тёплые слова без единого конкретного шага — это мягкость без конкретики. На разных типах она работает по-разному: тревожному всё равно, агрессивный теряет уважение, а рациональный — раздражается сильнее, чем от прямого отказа.",
  },
  {
    id: "q5",
    context: "Руководитель торопит с решением.",
    line: "«Если ты не разберёшься с задачами к завтрашнему дню, у тебя будут проблемы».",
    correct: "pressure",
    options: ["pressure", "firm_respect", "direct_criticism", "blame"],
    explanation:
      "Требование под угрозой последствий — это давление, а не твёрдость. Твёрдость с уважением держит позицию без угроз; давление почти всегда усиливает сопротивление и роняет доверие.",
  },
  {
    id: "q6",
    context: "Стороны нашли решение и готовы его закрепить.",
    line: "«Договорились: ты берёшь модуль А до пятницы, я забираю у тебя ревью третьей задачи».",
    correct: "commit_fix",
    options: ["commit_fix", "offer_options", "postpone_with_deadline", "objective_criteria"],
    explanation:
      "Имена, конкретные задачи и срок — это фиксация договорённости. Она единственная напрямую растит метрику согласованности (C), причём это единственная метрика, которая может и упасть — если после такой фиксации разговор скатится в повторное «я подумаю».",
  },
];
