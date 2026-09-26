import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScenario, getPersona } from "@/lib/content/loader";
import { createInitialState } from "@/lib/engine/state";
import { getUserId } from "@/lib/user";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { levelId } = body as { levelId: string };
  if (!levelId) return NextResponse.json({ error: "levelId is required" }, { status: 400 });

  const persona = getPersona(levelId);
  const scenario = getScenario(persona.scenarioId);
  const userId = await getUserId();
  const state = createInitialState(persona);

  const session = await prisma.session.create({
    data: {
      userId,
      scenarioId: scenario.id,
      personaId: persona.id,
      state: state as unknown as object,
      status: "active",
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    scenario,
    persona: { ...persona, reactions: undefined }, // don't leak the reaction matrix to the client
    openingLine: scenario.initiator === "employee" ? persona.openingLine : null,
    state,
  });
}
