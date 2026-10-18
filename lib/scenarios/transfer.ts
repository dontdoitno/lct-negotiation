import { ScenarioDraft } from "./types";
import { emptyDraft } from "./draft";

/**
 * Перенос сценария файлом: выгрузить, отредактировать или передать коллеге,
 * загрузить обратно.
 *
 * Формат намеренно простой: это сам черновик плюс служебная обёртка с версией.
 * Версия нужна, чтобы через месяц отличить файл старого формата от нового и
 * сказать об этом вслух, а не разложить его молча криво.
 */

export const TRANSFER_VERSION = 1;

export interface ScenarioFile {
  format: "arena-scenario";
  version: number;
  exportedAt: string;
  scenario: ScenarioDraft;
}

export function toScenarioFile(draft: ScenarioDraft, now: Date): ScenarioFile {
  return {
    format: "arena-scenario",
    version: TRANSFER_VERSION,
    exportedAt: now.toISOString(),
    scenario: draft,
  };
}

/** Имя файла по названию сценария. Кириллица и пробелы в имени ни к чему. */
export function scenarioFileName(draft: ScenarioDraft): string {
  const slug = draft.title
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${slug || "scenario"}.json`;
}

export type ImportResult =
  | { ok: true; draft: ScenarioDraft }
  | { ok: false; error: string };

/**
 * Разбор загруженного файла.
 *
 * Поля накладываются на пустой черновик, а не подменяют его: файл может быть
 * старым и чего-то не содержать, и тогда недостающее берётся по умолчанию, а
 * форма остаётся рабочей. Лишние поля отбрасываются.
 */
export function parseScenarioFile(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Это не JSON. Проверьте, что файл выгружен отсюда же." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "В файле ожидался объект со сценарием." };
  }

  const file = parsed as Partial<ScenarioFile>;
  if (file.format !== "arena-scenario") {
    return { ok: false, error: "Файл не похож на сценарий «Арены»: нет пометки формата." };
  }
  if (typeof file.version !== "number" || file.version > TRANSFER_VERSION) {
    return {
      ok: false,
      error: `Файл новее, чем эта версия админки понимает (формат ${file.version}).`,
    };
  }
  if (typeof file.scenario !== "object" || file.scenario === null) {
    return { ok: false, error: "В файле нет самого сценария." };
  }

  const base = emptyDraft();
  const incoming = file.scenario as Record<string, unknown>;
  const merged = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof ScenarioDraft)[]) {
    const value = incoming[key];
    // undefined оставляет значение по умолчанию: иначе ключ со значением
    // undefined затёр бы заготовку и форма упала бы на пустом поле.
    if (value !== undefined) merged[key] = value;
  }

  return { ok: true, draft: merged as unknown as ScenarioDraft };
}
