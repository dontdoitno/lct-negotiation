import { Persona, Scenario } from "@/lib/engine/types";
import { toPersona, toScenario } from "./adapters";
import { getScenarioDefinition, listPublishedScenarios } from "./repository";
import { ScenarioDefinition } from "./types";

/**
 * Единая точка доступа к сценариям во время игры.
 *
 * Раньше этим занимался lib/content/loader.ts, читавший JSON с диска. Теперь
 * источник истины — база: сценарии создаёт конструктор администратора, а файлы
 * в content/ остались только исходным материалом для сидов.
 */

export interface RuntimeLevel {
  levelId: string;
  definition: ScenarioDefinition;
  persona: Persona;
  scenario: Scenario;
  order: number;
}

/** Порядок на доске: сначала тот, на ком проще освоить механику. */
const TONE_ORDER: Record<string, number> = { rational: 0, anxious: 1, aggressive: 2, custom: 3 };

function toLevel(def: ScenarioDefinition, index: number): RuntimeLevel {
  return {
    levelId: def.id,
    definition: def,
    persona: toPersona(def),
    scenario: toScenario(def),
    order: index * 10 + (TONE_ORDER[def.tone] ?? 3),
  };
}

export async function getLevel(id: string): Promise<RuntimeLevel | null> {
  const def = await getScenarioDefinition(id);
  return def ? toLevel(def, 0) : null;
}

/** Бросает, а не возвращает null: вызывающий код уже проверил существование сессии. */
export async function requireLevel(id: string): Promise<RuntimeLevel> {
  const level = await getLevel(id);
  if (!level) throw new Error(`Сценарий не найден: ${id}`);
  return level;
}

export async function getPersonaById(id: string): Promise<Persona> {
  return (await requireLevel(id)).persona;
}

export async function getScenarioById(id: string): Promise<Scenario> {
  return (await requireLevel(id)).scenario;
}

/**
 * Опубликованные сценарии для пользовательского каталога. Черновики сюда не
 * попадают: их видно только в админке.
 */
export async function listRuntimeLevels(): Promise<RuntimeLevel[]> {
  const defs = await listPublishedScenarios();
  // Группы формируются по теме, внутри группы порядок задаёт тон.
  const topics = [...new Set(defs.map((d) => d.topic))];
  return defs
    .map((def) => toLevel(def, topics.indexOf(def.topic)))
    .sort((a, b) => a.order - b.order);
}
