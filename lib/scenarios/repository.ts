import { prisma } from "@/lib/db";
import { isAvatarId } from "./avatars";
import type { ScenarioDefinition as Row } from "@prisma/client";
import {
  HiddenLayerInput,
  Initiator,
  ReactionMatrix,
  ResistanceLines,
  ScenarioDefinition,
  ScenarioDraft,
  ScenarioStatus,
  StartMetrics,
  Tone,
} from "./types";

/**
 * Доступ к сценариям. Единственное место, где строка БД превращается в
 * ScenarioDefinition: поля Json приходят нетипизированными, и приводить их
 * по всему приложению было бы способом однажды промахнуться.
 */

function fromRow(row: Row): ScenarioDefinition {
  return {
    id: row.id,
    title: row.title,
    domain: row.domain,
    topic: row.topic,
    playerRole: row.playerRole,
    npcRole: row.npcRole,
    context: row.context as string[],
    npcName: row.npcName,
    npcPosition: row.npcPosition,
    avatar: isAvatarId(row.avatar) ? row.avatar : null,
    tone: row.tone as Tone,
    characterNote: row.characterNote,
    temperament: row.temperament,
    triggers: row.triggers as string[],
    soothers: row.soothers as string[],
    npcGoal: row.npcGoal,
    initiator: row.initiator as Initiator,
    openingLine: row.openingLine,
    exitLine: row.exitLine,
    hiddenLayers: row.hiddenLayers as unknown as HiddenLayerInput[],
    layerRevealCost: row.layerRevealCost,
    playerGoals: row.playerGoals as string[],
    successCriteria: row.successCriteria as string[],
    resources: row.resources as string[],
    constraints: row.constraints as string[],
    difficultyPreset: row.difficultyPreset as ScenarioDefinition["difficultyPreset"],
    startMetrics: row.startMetrics as unknown as StartMetrics,
    startMetricsExact: (row.startMetricsExact as unknown as Partial<Record<string, number>> | null) ?? null,
    turnLimit: row.turnLimit,
    sensitivity: row.sensitivity,
    showTypeInBrief: row.showTypeInBrief,
    trainingModeDefault: row.trainingModeDefault,
    reactions: row.reactions as unknown as ReactionMatrix,
    fallbackLines: (row.fallbackLines as unknown as ResistanceLines | null) ?? null,
    customPrompt: row.customPrompt,
    status: row.status as ScenarioStatus,
    playthroughCount: row.playthroughCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Поля, которые пишутся в БД. Json приводится к структуре Prisma. */
function toRowData(draft: ScenarioDraft) {
  return {
    title: draft.title,
    domain: draft.domain,
    topic: draft.topic,
    playerRole: draft.playerRole,
    npcRole: draft.npcRole,
    context: draft.context,
    npcName: draft.npcName,
    npcPosition: draft.npcPosition,
    avatar: draft.avatar,
    tone: draft.tone,
    characterNote: draft.characterNote,
    temperament: draft.temperament,
    triggers: draft.triggers,
    soothers: draft.soothers,
    npcGoal: draft.npcGoal,
    initiator: draft.initiator,
    openingLine: draft.openingLine,
    exitLine: draft.exitLine,
    hiddenLayers: draft.hiddenLayers,
    layerRevealCost: draft.layerRevealCost,
    playerGoals: draft.playerGoals,
    successCriteria: draft.successCriteria,
    resources: draft.resources,
    constraints: draft.constraints,
    difficultyPreset: draft.difficultyPreset,
    startMetrics: draft.startMetrics,
    startMetricsExact: draft.startMetricsExact ?? undefined,
    turnLimit: draft.turnLimit,
    sensitivity: draft.sensitivity,
    showTypeInBrief: draft.showTypeInBrief,
    trainingModeDefault: draft.trainingModeDefault,
    reactions: draft.reactions,
    fallbackLines: draft.fallbackLines ?? undefined,
    customPrompt: draft.customPrompt,
  } as never;
}

export async function listScenarios(options: { status?: ScenarioStatus } = {}): Promise<ScenarioDefinition[]> {
  const rows = await prisma.scenarioDefinition.findMany({
    where: options.status ? { status: options.status } : undefined,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(fromRow);
}

export async function listPublishedScenarios(): Promise<ScenarioDefinition[]> {
  return listScenarios({ status: "published" });
}

export async function getScenarioDefinition(id: string): Promise<ScenarioDefinition | null> {
  const row = await prisma.scenarioDefinition.findUnique({ where: { id } });
  return row ? fromRow(row) : null;
}

export async function createScenario(draft: ScenarioDraft): Promise<ScenarioDefinition> {
  const row = await prisma.scenarioDefinition.create({ data: toRowData(draft) });
  return fromRow(row);
}

export async function updateScenario(id: string, draft: ScenarioDraft): Promise<ScenarioDefinition> {
  const row = await prisma.scenarioDefinition.update({ where: { id }, data: toRowData(draft) });
  return fromRow(row);
}

export async function setScenarioStatus(id: string, status: ScenarioStatus): Promise<ScenarioDefinition> {
  const row = await prisma.scenarioDefinition.update({ where: { id }, data: { status } });
  return fromRow(row);
}

export async function deleteScenario(id: string): Promise<void> {
  await prisma.scenarioDefinition.delete({ where: { id } });
}

/** Копия всегда становится черновиком: опубликованный дубль никто не ждёт. */
export async function duplicateScenario(id: string): Promise<ScenarioDefinition | null> {
  const source = await getScenarioDefinition(id);
  if (!source) return null;
  const { ...draft } = source;
  return createScenario({ ...draft, title: `${source.title} (копия)` });
}

/** Тест-прогоны в счётчик не идут, поэтому инкремент вызывается отдельно. */
export async function incrementPlaythroughCount(id: string): Promise<void> {
  await prisma.scenarioDefinition.updateMany({
    where: { id },
    data: { playthroughCount: { increment: 1 } },
  });
}
