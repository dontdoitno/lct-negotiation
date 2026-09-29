import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPersonaById, getScenarioById } from "@/lib/scenarios/runtime";
import { computeOutcome, computeStars, isHiddenFailure } from "@/lib/engine/scoring";
import { buildRecommendations, findBreakpoints } from "@/lib/engine/recommendations";
import { SessionState, ActionCode } from "@/lib/engine/types";
import { checkEnding } from "@/lib/engine/endings";

async function buildDebriefPayload(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { turns: { orderBy: { index: "asc" } }, debrief: true },
  });
  if (!session) return null;

  const persona = await getPersonaById(session.personaId);
  const scenario = await getScenarioById(session.scenarioId);
  const state = session.state as unknown as SessionState;
  const ending = session.status === "active" ? checkEnding(state, scenario) : (session.status as "success" | "failed" | "timeout");

  const outcome = computeOutcome(state, scenario);
  const hiddenFailure = isHiddenFailure(state);
  const stars = computeStars(ending, state, scenario);

  const turnsForRec = session.turns.map((t) => ({
    actions: t.actions as unknown as ActionCode[],
    deltas: t.deltas as { R?: number },
    index: t.index,
  }));
  const recommendations = buildRecommendations(turnsForRec, state.R, state.C, state.T);
  const breakpoints = findBreakpoints(turnsForRec);

  const revealedTexts = persona.hiddenInterests
    .filter((l) => state.revealedLayers.includes(l.layer))
    .map((l) => ({ layer: l.layer, text: l.text }));
  const lockedLayers = persona.hiddenInterests
    .filter((l) => !state.revealedLayers.includes(l.layer))
    .map((l) => ({ layer: l.layer, trustThreshold: l.trustThreshold }));

  return {
    sessionId,
    scenario: { id: scenario.id, title: scenario.title },
    persona: { id: persona.id, displayName: persona.displayName, typeLabel: persona.typeLabel, type: persona.type },
    ending,
    stars,
    outcome,
    hiddenFailure,
    finalState: state,
    revealedInterests: revealedTexts,
    lockedInterests: lockedLayers,
    breakpoints,
    recommendations,
    timeline: session.turns.map((t) => ({
      index: t.index,
      playerText: t.playerText,
      npcText: t.npcText,
      actions: t.actions,
      deltas: t.deltas,
      rationale: t.rationale,
      isBreakpoint: breakpoints.includes(t.index),
    })),
    reflectionAnswers: session.debrief?.reflectionAnswers ?? null,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await buildDebriefPayload(id);
  if (!payload) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(payload);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reflectionAnswers = body.reflectionAnswers ?? {};

  const payload = await buildDebriefPayload(id);
  if (!payload) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.debrief.upsert({
    where: { sessionId: id },
    create: {
      sessionId: id,
      outcome: payload.outcome as unknown as object,
      stars: payload.stars,
      breakpoints: payload.breakpoints as unknown as object,
      reflectionAnswers: reflectionAnswers as unknown as object,
      recommendations: payload.recommendations as unknown as object,
    },
    update: {
      reflectionAnswers: reflectionAnswers as unknown as object,
    },
  });

  await prisma.progress.upsert({
    where: { userId_levelId: { userId: session.userId, levelId: session.personaId } },
    create: {
      userId: session.userId,
      levelId: session.personaId,
      bestStars: payload.stars,
      attempts: 1,
      unlocked: true,
    },
    update: {
      attempts: { increment: 1 },
    },
  });

  const progress = await prisma.progress.findUnique({
    where: { userId_levelId: { userId: session.userId, levelId: session.personaId } },
  });
  if (progress && payload.stars > progress.bestStars) {
    await prisma.progress.update({
      where: { userId_levelId: { userId: session.userId, levelId: session.personaId } },
      data: { bestStars: payload.stars },
    });
  }

  return NextResponse.json({ ...payload, reflectionAnswers });
}
