import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPersonaById, getScenarioById } from "@/lib/scenarios/runtime";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await prisma.session.findUnique({ where: { id }, include: { turns: { orderBy: { index: "asc" } } } });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const persona = await getPersonaById(session.personaId);
  const scenario = await getScenarioById(session.scenarioId);

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    isTestRun: session.isTestRun,
    scenario,
    persona: { ...persona, reactions: undefined },
    // Сохранённая при создании сессии реплика. Для старых сессий её нет —
    // тогда берём ориентир из сценария дословно.
    openingLine:
      scenario.initiator === "employee" ? (session.openingLine ?? persona.openingLine) : null,
    state: session.state,
    turns: session.turns,
  });
}
