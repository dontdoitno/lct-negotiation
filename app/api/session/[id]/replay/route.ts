import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPersonaById } from "@/lib/scenarios/runtime";
import { createInitialState } from "@/lib/engine/state";
import { SessionState } from "@/lib/engine/types";
import { getUserId } from "@/lib/user";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const branchTurn: number = body.branchTurn ?? 0;

  const source = await prisma.session.findUnique({ where: { id }, include: { turns: { orderBy: { index: "asc" } } } });
  if (!source) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const persona = await getPersonaById(source.personaId);
  const userId = await getUserId();

  const keptTurns = source.turns.filter((t) => t.index <= branchTurn);
  const state: SessionState =
    branchTurn <= 0 ? createInitialState(persona) : ((keptTurns[keptTurns.length - 1]?.stateAfter as unknown as SessionState) ?? createInitialState(persona));

  const branch = await prisma.session.create({
    data: {
      userId,
      scenarioId: source.scenarioId,
      personaId: source.personaId,
      state: state as unknown as object,
      status: "active",
      parentId: source.id,
      branchTurn,
    },
  });

  for (const t of keptTurns) {
    await prisma.turn.create({
      data: {
        sessionId: branch.id,
        index: t.index,
        playerText: t.playerText,
        inputMode: t.inputMode,
        actions: t.actions as unknown as object,
        deltas: t.deltas as unknown as object,
        stateAfter: t.stateAfter as unknown as object,
        npcText: t.npcText,
        rationale: t.rationale,
        latencyMs: t.latencyMs,
      },
    });
  }

  return NextResponse.json({ sessionId: branch.id, state, branchTurn, history: keptTurns });
}
