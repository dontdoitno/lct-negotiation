import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { getScenarioDefinition } from "@/lib/scenarios/repository";
import { toPersona } from "@/lib/scenarios/adapters";
import { createInitialState } from "@/lib/engine/state";
import { toScenario } from "@/lib/scenarios/adapters";
import { generateOpeningLine } from "@/lib/llm/actor";

export const dynamic = "force-dynamic";

/**
 * Тест-прогон не отдельный экран, а обычная сессия с пометкой: создаём её и
 * уходим на готовый экран звонка, который сам покажет плашку и отладку.
 * Дублировать экран ради двух панелей было бы способом развести их поведение.
 */
export default async function TestRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const definition = await getScenarioDefinition(id);
  if (!definition) notFound();

  const persona = toPersona(definition);
  const scenario = toScenario(definition);
  const userId = await getUserId();
  const openingLine =
    scenario.initiator === "employee" ? await generateOpeningLine(persona, scenario) : null;

  const session = await prisma.session.create({
    data: {
      userId,
      scenarioId: definition.id,
      personaId: definition.id,
      state: createInitialState(persona) as unknown as object,
      status: "active",
      isTestRun: true,
      openingLine,
    },
  });

  redirect(`/call/${session.id}`);
}
