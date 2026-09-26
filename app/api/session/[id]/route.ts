import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPersona, getScenario } from "@/lib/content/loader";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await prisma.session.findUnique({ where: { id }, include: { turns: { orderBy: { index: "asc" } } } });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const persona = getPersona(session.personaId);
  const scenario = getScenario(session.scenarioId);

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    scenario,
    persona: { ...persona, reactions: undefined },
    openingLine: scenario.initiator === "employee" ? persona.openingLine : null,
    state: session.state,
    turns: session.turns,
  });
}
