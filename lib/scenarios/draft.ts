import { MetricCode } from "@/lib/engine/types";
import {
  DEFAULT_CONSTRAINTS,
  DEFAULT_RESOURCES,
  DIFFICULTY_PRESETS,
  TONE_PRESETS,
} from "./presets";
import { DifficultyPreset, ScenarioDraft, Tone } from "./types";

/**
 * Черновик сценария: создание, применение пресетов и проверка перед
 * публикацией. Всё чистые функции — конструктор на них опирается, а тесты
 * проверяют без рендера.
 */

export function emptyDraft(): ScenarioDraft {
  const preset = TONE_PRESETS.rational;
  return {
    title: "",
    domain: "",
    topic: "",
    playerRole: "Руководитель проекта/отдела",
    npcRole: "Сотрудник",
    context: [""],
    npcName: "",
    npcPosition: "",
    tone: "rational",
    characterNote: preset.characterNote,
    temperament: preset.temperament,
    triggers: [...preset.triggers],
    soothers: [...preset.soothers],
    npcGoal: "",
    initiator: "npc",
    openingLine: "",
    exitLine: preset.exitLine,
    hiddenLayers: [{ text: "" }, { text: "" }],
    layerRevealCost: 2,
    playerGoals: [""],
    successCriteria: [""],
    resources: [...DEFAULT_RESOURCES],
    constraints: [...DEFAULT_CONSTRAINTS],
    difficultyPreset: "normal",
    startMetrics: { ...preset.startMetrics },
    startMetricsExact: null,
    turnLimit: 14,
    sensitivity: 1,
    showTypeInBrief: false,
    trainingModeDefault: false,
    reactions: structuredClone(preset.reactions),
    fallbackLines: preset.fallbackLines,
    customPrompt: null,
  };
}

/**
 * Смена пресета тона подставляет дефолты характера. Тексты, которые админ уже
 * написал сам (название, тема, цель собеседника), не трогаются: пресет — это
 * заготовка поведения, а не всего сценария.
 */
export function applyTonePreset(draft: ScenarioDraft, tone: Tone): ScenarioDraft {
  // «Свой» — это не пресет, а чистый лист: администратор описывает характер с
  // нуля. Оставлять чужие темперамент и матрицу реакций значит подсунуть ему
  // поведение, которое он не выбирал и может не заметить.
  if (tone === "custom") {
    return {
      ...draft,
      tone,
      characterNote: "",
      temperament: "",
      triggers: [],
      soothers: [],
      exitLine: "",
      reactions: {},
      fallbackLines: null,
      startMetricsExact: null,
    };
  }

  const preset = TONE_PRESETS[tone];
  return {
    ...draft,
    tone,
    characterNote: preset.characterNote,
    temperament: preset.temperament,
    triggers: [...preset.triggers],
    soothers: [...preset.soothers],
    exitLine: preset.exitLine,
    startMetrics: { ...preset.startMetrics },
    // Точная настройка принадлежала прошлому характеру, дальше она соврёт.
    startMetricsExact: null,
    reactions: structuredClone(preset.reactions),
    fallbackLines: preset.fallbackLines,
  };
}

/** Пресет сложности меняет три вещи разом, дальше их можно донастроить. */
export function applyDifficultyPreset(draft: ScenarioDraft, difficulty: DifficultyPreset): ScenarioDraft {
  const preset = DIFFICULTY_PRESETS[difficulty];
  return {
    ...draft,
    difficultyPreset: difficulty,
    turnLimit: preset.turnLimit,
    sensitivity: preset.sensitivity,
    startMetrics: { ...draft.startMetrics, ...preset.shift },
    startMetricsExact: null,
  };
}

export function resetReactionsToPreset(draft: ScenarioDraft): ScenarioDraft {
  if (draft.tone === "custom") return draft;
  return { ...draft, reactions: structuredClone(TONE_PRESETS[draft.tone].reactions) };
}

// ---------------------------------------------------------------------------
// Валидация перед публикацией
// ---------------------------------------------------------------------------

export type SectionId =
  | "context"
  | "npc"
  | "layers"
  | "goals"
  | "resources"
  | "difficulty"
  | "reactions"
  | "prompt";

/** Поля, которые конструктор умеет подсвечивать. */
export type FieldId =
  | "title"
  | "domain"
  | "topic"
  | "playerRole"
  | "npcRole"
  | "npcName"
  | "npcPosition"
  | "npcGoal"
  | "hiddenLayers"
  | "playerGoals"
  | "resources"
  | "turnLimit"
  | "layerRevealCost"
  | "reactions";

export interface ValidationIssue {
  section: SectionId;
  /** Какое поле подсветить красным. */
  field: FieldId;
  message: string;
}

const nonEmpty = (items: string[] | undefined) => (items ?? []).filter((i) => i?.trim() !== "");

/**
 * Черновик приходит из формы и из записей, сохранённых до появления новых
 * полей. Отсутствующее поле должно читаться как пустое и попадать в список
 * незаполненного, а не ронять весь редактор.
 */
const text = (value: string | undefined | null) => (value ?? "").trim();

/**
 * Проверки ровно те, что перечислены в требованиях к публикации. Черновик
 * можно сохранять в любом состоянии, блокируется только публикация.
 */
export function validateDraft(draft: ScenarioDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (text(draft.title) === "") issues.push({ section: "context", field: "title", message: "Не заполнено название сценария" });
  if (text(draft.domain) === "") issues.push({ section: "context", field: "domain", message: "Не заполнена сфера" });
  if (text(draft.topic) === "") issues.push({ section: "context", field: "topic", message: "Не заполнена тема переговоров" });
  if (text(draft.playerRole) === "") issues.push({ section: "context", field: "playerRole", message: "Не заполнена роль игрока" });
  if (text(draft.npcRole) === "") issues.push({ section: "context", field: "npcRole", message: "Не заполнена роль ИИ" });

  if (text(draft.npcName) === "") issues.push({ section: "npc", field: "npcName", message: "Не заполнено имя собеседника" });
  if (text(draft.npcPosition) === "") issues.push({ section: "npc", field: "npcPosition", message: "Не заполнена должность собеседника" });
  if (text(draft.npcGoal) === "") issues.push({ section: "npc", field: "npcGoal", message: "Не заполнена цель собеседника" });

  const layers = (draft.hiddenLayers ?? []).filter((l) => text(l?.text) !== "");
  if (layers.length < 2) issues.push({ section: "layers", field: "hiddenLayers", message: "Нужно минимум два слоя скрытых интересов" });
  if (layers.length > 5) issues.push({ section: "layers", field: "hiddenLayers", message: "Слоёв не может быть больше пяти" });

  if (nonEmpty(draft.playerGoals).length < 1) {
    issues.push({ section: "goals", field: "playerGoals", message: "Нужна хотя бы одна цель игрока" });
  }

  if (draft.tone === "custom") {
    const filled = Object.values(draft.reactions ?? {}).some((row) =>
      Object.values(row ?? {}).some((level) => level && level !== "none"),
    );
    if (!filled) {
      issues.push({
        section: "reactions",
        field: "reactions",
        message: "Для своего характера нужно заполнить хотя бы одну реакцию: иначе метрики не двигаются",
      });
    }
  }

  if (nonEmpty(draft.resources).length < 1) {
    issues.push({ section: "resources", field: "resources", message: "Нужен хотя бы один ресурс" });
  }

  if ((draft.turnLimit ?? 0) < 4 || (draft.turnLimit ?? 0) > 40) {
    issues.push({ section: "difficulty", field: "turnLimit", message: "Лимит реплик должен быть от 4 до 40" });
  }
  if ((draft.layerRevealCost ?? 0) < 1 || (draft.layerRevealCost ?? 0) > 5) {
    issues.push({ section: "layers", field: "layerRevealCost", message: "Цена раскрытия слоя должна быть от 1 до 5" });
  }

  return issues;
}

/** Поля с ошибками — для красной обводки в конструкторе. */
export function invalidFields(draft: ScenarioDraft): Map<FieldId, string> {
  const map = new Map<FieldId, string>();
  for (const issue of validateDraft(draft)) {
    if (!map.has(issue.field)) map.set(issue.field, issue.message);
  }
  return map;
}

/** Секции с незаполненными полями — для отметок в якорной навигации. */
export function incompleteSections(draft: ScenarioDraft): Set<SectionId> {
  return new Set(validateDraft(draft).map((i) => i.section));
}

export function canPublish(draft: ScenarioDraft): boolean {
  return validateDraft(draft).length === 0;
}

/** Убирает пустые строки списков — их незачем хранить и показывать в промте. */
export function cleanDraft(draft: ScenarioDraft): ScenarioDraft {
  return {
    ...draft,
    context: nonEmpty(draft.context),
    triggers: nonEmpty(draft.triggers),
    soothers: nonEmpty(draft.soothers),
    playerGoals: nonEmpty(draft.playerGoals),
    successCriteria: nonEmpty(draft.successCriteria),
    resources: nonEmpty(draft.resources),
    constraints: nonEmpty(draft.constraints),
    hiddenLayers: (draft.hiddenLayers ?? []).filter((l) => text(l?.text) !== ""),
  };
}

/** Точная настройка метрики поверх уровня. Пустое значение возвращает уровень. */
export function setExactMetric(
  draft: ScenarioDraft,
  metric: MetricCode,
  value: number | null,
): ScenarioDraft {
  const exact = { ...(draft.startMetricsExact ?? {}) };
  if (value === null) delete exact[metric];
  else exact[metric] = Math.max(0, Math.min(100, Math.round(value)));
  return { ...draft, startMetricsExact: Object.keys(exact).length > 0 ? exact : null };
}
