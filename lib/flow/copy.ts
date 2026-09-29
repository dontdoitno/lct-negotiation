import { QuizOption, QuizOutcome, QuizRole, QuizTopic } from "./types";

/**
 * Every piece of interface copy for the flow screens, in one place.
 *
 * Wording is taken verbatim from docs/full-flow-specs.md — do not paraphrase
 * it here. If a string needs to change, change it in the spec first.
 */

export const LANDING = {
  title: "Тренажёр сложных разговоров с сотрудниками",
  subtitle:
    "Получите безопасную практику делового общения и переговоров на AI-сотруднике с подробным анализом диалога",
  values: [
    {
      title: "Что тренируем",
      text: "Оттачиваем soft-skills, поведение в конфликте и навык договариваться",
    },
    {
      title: "С кем",
      text: "С AI-собеседниками с разными типами характера. У каждого своя логика и свои скрытые причины",
    },
    {
      title: "Что получаете",
      text: "Обратную связь по метрикам переговоров, разбор ходов и рекомендации",
    },
  ],
  primaryCta: "Попробовать разговор",
  secondaryCta: "Войти",
  productName: "Арена переговоров",
};

export const QUIZ = {
  stepTitle: "Три вопроса, чтобы подобрать первый разговор",
  progress: (n: number, total: number) => `Вопрос ${n} из ${total}`,
  back: "Назад",
  questions: {
    role: {
      title: "Какая у вас роль?",
      options: [
        { value: "teamlead", label: "Тимлид" },
        { value: "group_head", label: "Руководитель группы" },
        { value: "dept_head", label: "Начальник отдела" },
      ] as QuizOption<QuizRole>[],
    },
    topic: {
      title: "Что сейчас актуально?",
      options: [
        { value: "overload", label: "Сотрудники жалуются на объём работы" },
        { value: "performance_drop", label: "Падение показателей на последний период" },
        { value: "skipped_deadline", label: "Сотрудники не выполняют дедлайны" },
        { value: "conflict", label: "Конфликты в коллективе" },
        { value: "just_practice", label: "Просто хочу потренироваться" },
      ] as QuizOption<QuizTopic>[],
    },
    outcome: {
      title: "Чем обычно заканчиваются такие разговоры?",
      options: [
        { value: "not_followed", label: "Договоренностью, которая потом не выполняется" },
        { value: "conflict", label: "Конфликтом" },
        { value: "uncertain_situation", label: "Неопределенной ситуацией" },
      ] as QuizOption<QuizOutcome>[],
    },
  },
};

export const SIGNUP = {
  title: "Сохраним ваш прогресс",
  subtitle: "Результаты разборов и карта навыков останутся за вами",
  email: "Email",
  password: "Пароль",
  submit: "Создать аккаунт",
  submitting: "Создаём аккаунт…",
  guest: "Продолжить как гость",
  haveAccount: "Уже есть аккаунт?",
  login: "Войти",
  errors: {
    emailRequired: "Введите email",
    emailInvalid: "Похоже, в адресе опечатка",
    passwordRequired: "Введите пароль",
    passwordShort: "Минимум 8 символов",
    server: "Не получилось создать аккаунт. Попробуйте ещё раз",
  },
};

export const LOGIN = {
  title: "С возвращением",
  submit: "Войти",
  submitting: "Входим…",
  noAccount: "Нет аккаунта?",
  signup: "Создать",
  errors: { server: "Не получилось войти. Проверьте email и пароль" },
};

export const RULES = {
  cards: [
    {
      title: "Как это работает",
      text: "Вы — руководитель. Напротив — AI-сотрудник со своим характером, своей целью и скрытыми причинами, о которых он не скажет сразу. Говорите текстом или голосом, как в обычном звонке.",
    },
    {
      title: "Что вы качаете",
      metrics: [
        "A — адаптивность: подбираете подход под характер собеседника",
        "T — доверие: он готов говорить честно",
        "R — сопротивление: насколько он принимает ваши аргументы",
        "I — скрытые интересы: вы раскрыли его настоящие причины",
        "S — пространство решений: сколько вариантов решений найдено",
        "C — согласованность: есть ли четкие договоренности",
      ],
      footnote:
        "Это гарвардский метод: отделять человека от проблемы, идти к интересам за позициями, искать варианты и опираться на критерии.",
    },
    {
      title: "Как выиграть",
      text: "Ваша цель - добиться удовлетворения обеих сторон. Вам необходимо расположить собеседника, докопаться до истинных причин проблемы, найти варианты решений, зафиксировать договоренности.",
    },
  ],
  next: "Далее",
  finish: "Понятно, начать",
  skip: "Пропустить",
};

export const CASES = {
  callLabel: (n: number) => `Созвон #${n}`,
  firstTitle: "Ваш первый разговор",
  progressTitle: "Ваши разговоры",
  recommendedBadge: "Рекомендуем начать отсюда",
  recommendedNote: "Судя по вашим ответам, это ваш случай",
  lockedNote: "Откроется после первого разговора",
  attempts: (n: number) => (n === 1 ? "1 попытка" : `${n} попыток`),
  noAttempts: "Не пройдено",
  nextStepTitle: "Что взять дальше",

  // Динамический каталог: фильтры, поиск и пустые состояния
  searchLabel: "Поиск",
  searchPlaceholder: "Название или тема разговора",
  filterDomain: "Сфера",
  filterTone: "Характер",
  filterDifficulty: "Сложность",
  filterUnplayed: "Только непройденные",
  resetFilters: "Сбросить фильтры",
  nothingFound: "Под эти условия ничего не подошло.",
  emptyTitle: "Ни одного опубликованного сценария",
  emptyAdminHint: "Создайте сценарий в админке, и он появится здесь.",
  emptyUserHint: "Разговоры ещё не опубликованы. Загляните позже.",
  emptyAdminCta: "Создать сценарий",

  // Левая колонка со сферами и ленты разговоров
  railTitle: "Сферы",
  railCollapse: "Свернуть список сфер",
  railExpand: "Показать список сфер",
  allDomains: "Все",
  /** Склонение по числу: 1 созвон, 2 созвона, 5 созвонов. */
  callCount: (n: number) => {
    const last = n % 10;
    const lastTwo = n % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return `${n} созвонов`;
    if (last === 1) return `${n} созвон`;
    if (last >= 2 && last <= 4) return `${n} созвона`;
    return `${n} созвонов`;
  },
  scrollLeft: "Показать предыдущие разговоры",
  scrollRight: "Показать следующие разговоры",
  startCall: "Начать разговор",
  openThisCase: "Открыть этот кейс",
  randomPick: "Мы подобрали разговор наугад.",
  refinePick: "Ответьте на три вопроса, чтобы подобрать точнее",
};

/**
 * Working out who you were talking to is one of the exercises, so the case
 * never names the type — the debrief asks for a guess and only then reveals it.
 */
export const TYPE_GUESS = {
  sectionTitle: "Тип личности",
  question: "Кто это был?",
  hint: "Типов всего три. Выберите тот, который, по вашему мнению, вам достался.",
  submit: "Проверить",
  options: [
    { value: "aggressive", label: "Агрессивный" },
    { value: "anxious", label: "Тревожный" },
    { value: "rational", label: "Рациональный" },
  ] as QuizOption<"aggressive" | "anxious" | "rational">[],
  correct: "Верно, тип вы определили",
  wrong: "Тип вы не определили",
  yourAnswer: "Ваш ответ",
  trueAnswer: "На самом деле",
  markersTitle: "По каким признакам это было видно",
  markers: {
    aggressive:
      "Повышает тон, перебивает, спорит с самой постановкой вопроса. Давит на вашу позицию, а не разбирает задачу.",
    anxious:
      "Говорит тихо, извиняется, не просит прямо — намекает и ждёт, что вы догадаетесь сами. Замолкает при любом нажиме.",
    rational:
      "Опирается на факты и цифры, торгуется, просит обоснование и сам предлагает компромиссные варианты.",
  } as Record<"aggressive" | "anxious" | "rational", string>,
  whyItMatters:
    "От типа зависит, что снимает сопротивление: тревожному нужно признание, агрессивному — твёрдая рамка, рациональному — критерии.",
};

/** Админский контур. Тот же язык интерфейса, что и в пользовательском. */
export const ADMIN = {
  sectionTitle: "Админка",
  backToCatalog: "К каталогу",
  listTitle: "Сценарии",
  create: "Создать сценарий",
  generate: "Сгенерировать сценарий",
  emptyTitle: "Пока ни одного сценария",
  emptyHint: "Создайте сценарий вручную или сгенерируйте черновик по шести полям.",
  columns: {
    title: "Название",
    domain: "Сфера",
    topic: "Тема",
    tone: "Характер",
    difficulty: "Сложность",
    status: "Статус",
    playthroughs: "Прохождений",
    updatedAt: "Изменён",
  },
  statusDraft: "Черновик",
  statusPublished: "Опубликован",
  actions: {
    edit: "Редактировать",
    duplicate: "Дублировать",
    test: "Тест-прогон",
    publish: "Опубликовать",
    unpublish: "Снять с публикации",
    remove: "Удалить",
  },
  confirmDelete: (title: string) => `Удалить сценарий «${title}»? Отменить это будет нельзя.`,
  filterStatus: "Статус",
  filterDomain: "Сфера",
  searchPlaceholder: "Название или тема",
  sortUpdated: "По дате изменения",
  sortPlaythroughs: "По числу прохождений",
  nothingFound: "Под эти условия ничего не подошло.",
};

export const COMMITMENTS = {
  title: "Зафиксируйте договорённости",
  subtitle: "Своими словами, как записали бы в протокол встречи",
  fields: {
    what: "Что делаем",
    who: "Кто отвечает",
    deadline: "К какому сроку",
    check: "Как проверяем",
  },
  addItem: "Добавить пункт",
  removeItem: "Удалить пункт",
  submit: "Отправить сотруднику",
  submitting: "Отправляем…",
  finish: "Завершить разговор",
  closeConfirm: "Закрыть окно? Введённые договорённости не сохранятся.",
  maxItemsNote: "Максимум пять пунктов",
};

export const ENDED = {
  byPersona: {
    aggressive: "Он сорвался и закончил разговор",
    anxious: "Он согласился формально и тихо ушёл",
    rational: "Он сказал, что подумает, и вышел",
  },
  turnLimit: "Время разговора вышло",
  subtitle: "Разбор всё равно готов — самое важное в нём",
  cta: "Посмотреть разбор",
};

export const DEBRIEF = {
  outcomeTitle: "Итог",
  outcomeLabels: {
    goalAchievement: "Цель достигнута",
    employeeSatisfaction: "Удовлетворённость сотрудника",
    commitmentReadiness: "Готовность выполнять договорённости",
    conflictRisk: "Риск конфликта или ухода",
  },
  metricsTitle: "Метрики",
  metricsLegendStart: "Было",
  metricsLegendEnd: "Стало",
  timelineTitle: "Таймлайн разговора",
  timelineShowAll: "Показать все реплики",
  layersTitle: "Скрытые интересы",
  layerNotReached: "Вы до этого не дошли",
  layerReachedAt: (turn: number) => `Раскрыт на реплике ${turn}`,
  workedTitle: "Что сработало",
  killedTitle: "Что убило разговор",
  rewriteTitle: "Переписанная реплика",
  rewriteSaid: "Вы сказали",
  rewriteHeard: "Он услышал",
  rewriteCouldBe: "Могло быть",
  actionsAgain: "Пройти этот кейс ещё раз",
  actionsOtherType: "Тот же кейс, другой характер",
  actionsNext: "Следующий кейс",
  guestTitle: "Сохранить результат и прогресс",
};

/** Action codes → the human wording the debrief timeline shows on badges. */
export const ACTION_BADGE: Record<string, string> = {
  open_question: "открытый вопрос",
  ack_emotion: "признание эмоции",
  firm_respect: "твёрдость и уважение",
  objective_criteria: "опора на критерии",
  offer_options: "предложение вариантов",
  commit_fix: "фиксация",
  specific_recognition: "признание работы",
  apology: "признание ошибки",
  pressure: "давление",
  blame: "обвинение",
  softness_no_substance: "мягкость без твёрдости",
  ignore_emotion: "игнорирование эмоции",
  mirror_aggression: "зеркалирование агрессии",
  direct_criticism: "прямая критика",
  raise_voice: "повышение голоса",
  threat_of_firing: "угроза увольнением",
  postpone_no_deadline: "«я подумаю» без срока",
  postpone_with_deadline: "«я подумаю» со сроком",
  postpone_repeat: "повторное «я подумаю»",
  small_talk: "общие слова",
  clarify_fact: "уточнение факта",
  off_topic: "не по теме",
};
