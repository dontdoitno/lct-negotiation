import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getPersonaById, getScenarioById } from "@/lib/scenarios/runtime";
import { applyTurn } from "@/lib/engine/state";
import { checkEnding } from "@/lib/engine/endings";
import { scoreTurn } from "@/lib/engine/scoring";
import { analyzeTurn } from "@/lib/llm/analyzer";
import { streamActorReply } from "@/lib/llm/actor";
import { humanizeActions } from "@/lib/llm/humanize";
import { ActionCode, SessionState } from "@/lib/engine/types";
import { incrementPlaythroughCount } from "@/lib/scenarios/repository";

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const text: string = (body.text ?? "").trim();
  const inputMode: string = body.inputMode ?? "text";

  if (!text) return new Response(JSON.stringify({ error: "empty_text" }), { status: 400 });

  const session = await prisma.session.findUnique({ where: { id }, include: { turns: { orderBy: { index: "asc" } } } });
  if (!session) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  if (session.status !== "active") return new Response(JSON.stringify({ error: "session_finished" }), { status: 409 });

  const persona = await getPersonaById(session.personaId);
  const scenario = await getScenarioById(session.scenarioId);
  const state = session.state as unknown as SessionState;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const started = Date.now();

      const historyStrings = session.turns
        .slice(-4)
        .flatMap((t) => [`Руководитель: ${t.playerText}`, `${persona.displayName}: ${t.npcText}`]);

      const analysis = await analyzeTurn(text, historyStrings);
      const { state: nextState, deltas, revealed } = applyTurn(state, analysis.actions, persona);
      const ending = checkEnding(nextState, scenario);

      controller.enqueue(
        enc.encode(
          sse("analysis", {
            actions: analysis.actions,
            tone: analysis.tone,
            rationale: analysis.rationale,
            deltas,
          }),
        ),
      );

      const goals = scenario.playerGoals.map((g) => {
        const value = nextState[g.metric];
        const done = g.direction === "below" ? value <= g.threshold : value >= g.threshold;
        const progress = g.direction === "below" ? Math.min(1, Math.max(0, 1 - (value - g.threshold) / (100 - g.threshold))) : Math.min(1, value / g.threshold);
        return { id: g.id, text: g.text, progress, done };
      });

      controller.enqueue(
        enc.encode(
          sse("state", {
            raw: nextState,
            goals,
            turn: nextState.turn,
            turnsLeft: Math.max(0, scenario.turnLimit - nextState.turn),
            revealedCount: nextState.revealedLayers.length,
            totalLayers: persona.hiddenInterests.length,
          }),
        ),
      );

      if (revealed) {
        controller.enqueue(enc.encode(sse("reveal", revealed)));
      }

      const history = session.turns.map((t) => [
        { speaker: "player" as const, text: t.playerText },
        { speaker: "npc" as const, text: t.npcText },
      ]).flat();
      history.push({ speaker: "player" as const, text });

      let npcText = "";
      const actorGen = streamActorReply({
        persona,
        scenario,
        state: nextState,
        resistanceDelta: deltas.R ?? 0,
        revealed,
        ending,
        actionsHuman: humanizeActions(analysis.actions),
        history,
        turnIndex: nextState.turn,
      });

      let chunkResult = await actorGen.next();
      while (!chunkResult.done) {
        npcText += chunkResult.value;
        controller.enqueue(enc.encode(sse("npc_chunk", { text: chunkResult.value })));
        chunkResult = await actorGen.next();
      }
      if (chunkResult.value) npcText = chunkResult.value;

      const { points, breakdown } = scoreTurn(analysis.actions as ActionCode[], persona, !!revealed);
      const latencyMs = Date.now() - started;
      const status = ending ?? "active";

      await prisma.turn.create({
        data: {
          sessionId: id,
          index: nextState.turn,
          playerText: text,
          inputMode,
          actions: analysis.actions,
          deltas,
          stateAfter: nextState as unknown as object,
          npcText,
          rationale: analysis.rationale,
          latencyMs,
        },
      });

      await prisma.session.update({
        where: { id },
        data: {
          state: nextState as unknown as object,
          status,
          finishedAt: ending ? new Date() : undefined,
        },
      });

      // Счётчик прохождений растёт один раз, на завершении разговора.
      // Тест-прогоны администратора в него не попадают.
      if (ending && !session.isTestRun) {
        await incrementPlaythroughCount(session.personaId);
      }

      controller.enqueue(
        enc.encode(
          sse("npc_done", {
            text: npcText,
            status,
            points,
            breakdown,
          }),
        ),
      );

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
