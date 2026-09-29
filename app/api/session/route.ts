import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScenarioById, getPersonaById } from "@/lib/scenarios/runtime";
import { createInitialState } from "@/lib/engine/state";
import { generateOpeningLine } from "@/lib/llm/actor";
import { getUserId } from "@/lib/user";
import { isAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { levelId, testRun } = body as { levelId: string; testRun?: boolean };
  if (!levelId) return NextResponse.json({ error: "levelId is required" }, { status: 400 });

  const persona = await getPersonaById(levelId);
  const scenario = await getScenarioById(persona.scenarioId);
  const userId = await getUserId();
  const state = createInitialState(persona);
  // Тест-прогон помечается только для администратора: иначе флагом можно было
  // бы прятать от статистики обычные прохождения.
  const isTestRun = testRun === true && (await isAdmin());

  // Текст из конструктора — ориентир по смыслу, а не готовая фраза, поэтому
  // первую реплику собеседника пишет модель. Делаем это один раз, при создании
  // сессии, и сохраняем: иначе начало разговора менялось бы при перезагрузке.
  const openingLine =
    scenario.initiator === "employee" ? await generateOpeningLine(persona, scenario) : null;

  const session = await prisma.session.create({
    data: {
      userId,
      scenarioId: scenario.id,
      personaId: persona.id,
      state: state as unknown as object,
      status: "active",
      isTestRun,
      openingLine,
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    isTestRun,
    scenario,
    persona: { ...persona, reactions: undefined }, // don't leak the reaction matrix to the client
    openingLine,
    state,
  });
}
