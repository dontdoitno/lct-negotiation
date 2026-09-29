import { prisma } from "@/lib/db";
import { getPersonaById, getScenarioById } from "@/lib/scenarios/runtime";
import { runPrefilter } from "./prefilter";
import { callJudge } from "./judge";
import { callActor } from "./actor";
import { applyDeltas, checkFinished, FinishStatus } from "./applyDeltas";
import { getJudgeLLMClient } from "./llmClient";
import { JUDGE_CONFIG } from "./config";
import { engineStateToJudgeMetrics, HistoryTurn, JudgeMetrics, PersonaType, ZERO_DELTAS } from "./types";

function levelIdFor(scenarioId: string, personaType: PersonaType): string {
  // Our content naming convention is "<scenario-prefix>-<slug>" — reuse the
  // scenario's own prefix rather than hardcoding a 2-way mapping, so this
  // doesn't silently misroute as more scenarios get added.
  const prefix = scenarioId.split("-")[0];
  return `${prefix}-${personaType}`;
}

async function scenarioContextFor(scenarioId: string) {
  return getScenarioById(scenarioId);
}

export async function createJudgeSession(userId: string, scenarioId: string, personaType: PersonaType) {
  const levelId = levelIdFor(scenarioId, personaType);
  const persona = await getPersonaById(levelId); // throws a clear error if content is missing (e.g. scenario 2 personas not authored yet)
  const scenario = await scenarioContextFor(scenarioId);
  const metrics = engineStateToJudgeMetrics(persona.initialState);

  const session = await prisma.judgeSession.create({
    data: {
      userId,
      scenarioId,
      personaType,
      metrics: metrics as unknown as object,
      status: "active",
    },
  });

  return {
    sessionId: session.id,
    metrics,
    openingLine: scenario.initiator === "employee" ? persona.openingLine : null,
    scenario: { id: scenario.id, title: scenario.title, context: scenario.context },
    persona: { displayName: persona.displayName, position: persona.position },
  };
}

export interface TurnResult {
  reply: string;
  metrics: JudgeMetrics;
  deltas: JudgeMetrics;
  techniquesUsed: string[];
  techniquesViolated: string[];
  turn: number;
  finished: boolean;
  status: FinishStatus;
  degraded: boolean;
}

export async function processJudgeTurn(sessionId: string, text: string): Promise<TurnResult> {
  const session = await prisma.judgeSession.findUnique({
    where: { id: sessionId },
    include: { turns: { orderBy: { index: "asc" } } },
  });
  if (!session) throw new Error("session_not_found");
  if (session.status !== "active") throw new Error("session_finished");

  const personaType = session.personaType as PersonaType;
  const levelId = levelIdFor(session.scenarioId, personaType);
  const persona = await getPersonaById(levelId);
  const scenario = await getScenarioById(session.scenarioId);
  const currentMetrics = session.metrics as unknown as JudgeMetrics;

  const history: HistoryTurn[] = session.turns.map((t) => ({ playerText: t.playerText, npcReply: t.npcReply }));
  const client = getJudgeLLMClient();
  const nextIndex = session.turnCount + 1;

  const prefilterResult = runPrefilter(text, personaType);

  let rawDeltas: JudgeMetrics;
  let techniquesUsed: string[] = [];
  let techniquesViolated: string[] = [];
  let rationale: string;
  let degraded = false;
  let npcReply: string;
  let latencyMs = 0;
  let prefiltered = false;
  let prefilterReason: string | undefined;

  if (prefilterResult.triggered) {
    prefiltered = true;
    prefilterReason = prefilterResult.reason;
    rawDeltas = prefilterResult.deltas;
    rationale = `Предфильтр: ${prefilterResult.reason}.`;
    npcReply = prefilterResult.reply;
  } else {
    const judgeResult = await callJudge(client, { metrics: currentMetrics, history, text });
    rawDeltas = judgeResult.deltas;
    techniquesUsed = judgeResult.techniquesUsed;
    techniquesViolated = judgeResult.techniquesViolated;
    rationale = judgeResult.rationale;
    degraded = judgeResult.degraded;
    latencyMs += judgeResult.latencyMs;

    const { metrics: metricsAfterForActor } = applyDeltas(currentMetrics, rawDeltas, {
      step: JUDGE_CONFIG.step,
      maxPerTurn: JUDGE_CONFIG.maxDeltaPerTurn,
    });

    const actorResult = await callActor(client, {
      personaType,
      scenarioContext: scenario.context,
      personaRole: `${persona.position}. ${persona.goal}`,
      managerResources: scenario.managerResources,
      managerConstraints: scenario.managerConstraints,
      metrics: metricsAfterForActor,
      history,
      judgeResult,
    });
    npcReply = actorResult.text;
    latencyMs += actorResult.latencyMs;
  }

  const { metrics: nextMetrics, applied } = applyDeltas(currentMetrics, rawDeltas, {
    step: JUDGE_CONFIG.step,
    maxPerTurn: JUDGE_CONFIG.maxDeltaPerTurn,
  });

  const status = checkFinished(nextMetrics, nextIndex, {
    turnLimit: JUDGE_CONFIG.turnLimit,
    commitmentSuccessThreshold: JUDGE_CONFIG.commitmentSuccessThreshold,
    trustFailThreshold: JUDGE_CONFIG.trustFailThreshold,
  });

  await prisma.judgeTurn.create({
    data: {
      sessionId,
      index: nextIndex,
      playerText: text,
      prefiltered,
      prefilterReason,
      rawDeltas: rawDeltas as unknown as object,
      appliedDeltas: applied as unknown as object,
      metricsAfter: nextMetrics as unknown as object,
      techniquesUsed: techniquesUsed as unknown as object,
      techniquesViolated: techniquesViolated as unknown as object,
      rationale,
      degraded,
      npcReply,
      latencyMs,
    },
  });

  await prisma.judgeSession.update({
    where: { id: sessionId },
    data: {
      metrics: nextMetrics as unknown as object,
      turnCount: nextIndex,
      status,
      finishedAt: status !== "active" ? new Date() : undefined,
    },
  });

  return {
    reply: npcReply,
    metrics: nextMetrics,
    deltas: applied,
    techniquesUsed,
    techniquesViolated,
    turn: nextIndex,
    finished: status !== "active",
    status,
    degraded,
  };
}

export interface JudgeReport {
  sessionId: string;
  status: string;
  finalMetrics: JudgeMetrics;
  metricsByTurn: { turn: number; metrics: JudgeMetrics }[];
  techniquesUsed: string[];
  techniquesViolated: string[];
  summary: string;
}

export async function buildJudgeReport(sessionId: string): Promise<JudgeReport | null> {
  const session = await prisma.judgeSession.findUnique({
    where: { id: sessionId },
    include: { turns: { orderBy: { index: "asc" } } },
  });
  if (!session) return null;

  const metricsByTurn = session.turns.map((t) => ({
    turn: t.index,
    metrics: t.metricsAfter as unknown as JudgeMetrics,
  }));

  const techniquesUsed = Array.from(new Set(session.turns.flatMap((t) => t.techniquesUsed as unknown as string[])));
  const techniquesViolated = Array.from(new Set(session.turns.flatMap((t) => t.techniquesViolated as unknown as string[])));
  const finalMetrics = (session.metrics as unknown as JudgeMetrics) ?? ZERO_DELTAS;

  const summaryLines = [
    `Итог: ${session.status}. Ходов: ${session.turnCount}.`,
    `Финальные метрики — доверие: ${finalMetrics.trust}, сопротивление: ${finalMetrics.resistance}, договорённости: ${finalMetrics.commitment}.`,
    techniquesUsed.length ? `Применённые приёмы: ${techniquesUsed.join(", ")}.` : "Ни один именованный приём не был засчитан.",
    techniquesViolated.length ? `Нарушенные приёмы: ${techniquesViolated.join(", ")}.` : "Явных нарушений не зафиксировано.",
  ];

  return {
    sessionId,
    status: session.status,
    finalMetrics,
    metricsByTurn,
    techniquesUsed,
    techniquesViolated,
    summary: summaryLines.join(" "),
  };
}
