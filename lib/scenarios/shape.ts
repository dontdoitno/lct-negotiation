import { ScenarioDraft } from "./types";
import { emptyDraft } from "./draft";

/**
 * Беглая проверка формы черновика, пришедшего по сети.
 *
 * Это не проверка содержания: за «заполнены ли обязательные поля» отвечает
 * `validateDraft`. Здесь только защита от запроса не той формы, чтобы роут
 * отвечал понятным «вы прислали не то», а не падал с 500.
 */
export function checkDraftShape(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "Ожидался объект сценария.";
  }
  const draft = value as Record<string, unknown>;
  const base = emptyDraft() as unknown as Record<string, unknown>;

  const missing = Object.keys(base).filter((k) => draft[k] === undefined);
  if (missing.length > 0) {
    return `В запросе нет полей: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? " и других" : ""}.`;
  }

  // Типы, на которых падает запись в базу, если прислать не то.
  const arrays: (keyof ScenarioDraft)[] = [
    "context", "triggers", "soothers", "hiddenLayers",
    "playerGoals", "successCriteria", "resources", "constraints",
  ];
  for (const key of arrays) {
    if (!Array.isArray(draft[key])) return `Поле «${key}» должно быть списком.`;
  }
  for (const key of ["turnLimit", "layerRevealCost", "sensitivity"] as const) {
    if (typeof draft[key] !== "number" || !Number.isFinite(draft[key])) {
      return `Поле «${key}» должно быть числом.`;
    }
  }
  if (typeof draft.startMetrics !== "object" || draft.startMetrics === null) {
    return "Поле «startMetrics» должно быть объектом.";
  }
  return null;
}
