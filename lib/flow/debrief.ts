import { prisma } from "@/lib/db";
import { requireLevel, listRuntimeLevels } from "@/lib/scenarios/runtime";
import { computeOutcome } from "@/lib/engine/scoring";
import { ActionCode, MetricCode, SessionState } from "@/lib/engine/types";
import { CONSTRUCTIVE_ACTIONS } from "@/lib/engine/types";
import {
  DebriefData,
  EndReason,
  HiddenLayerResult,
  RewriteBlock,
  TimelineTurn,
  WorkedItem,
} from "./types";
import { ACTION_BADGE } from "./copy";

const METRICS: MetricCode[] = ["A", "T", "R", "I", "S", "C"];

function endReasonOf(status: string, turnCount: number, turnLimit: number): EndReason {
  if (status === "success") return "committed";
  if (status === "failed") return "ai_left";
  if (turnCount >= turnLimit) return "turn_limit";
  return "turn_limit";
}

/**
 * One sentence naming the real outcome, including the case where the numbers
 * look fine but trust never arrived — the product's whole point is that a
 * formal "yes" is not the same as agreement.
 */
function buildVerdict(state: SessionState, endReason: EndReason, name: string): string {
  if (state.C >= 70 && state.T < 40) {
    return `Формально договорились. Но интересы не выяснены и доверия нет — ${name} согласился, чтобы разговор закончился.`;
  }
  if (endReason === "ai_left") {
    return `Разговор оборвался на сопротивлении. До настоящей причины дойти не удалось.`;
  }
  if (endReason === "turn_limit" && state.C < 50) {
    return `Время вышло, а конкретики так и не появилось: кто, что и к какому сроку — не зафиксировано.`;
  }
  if (state.C >= 70 && state.T >= 60 && state.I >= 60) {
    return `Договорённости есть, и они держатся на доверии: ${name} назвал настоящую причину и принял план.`;
  }
  return `Разговор состоялся, но результат половинчатый — часть метрик осталась внизу.`;
}

function splitWorkedKilled(
  turns: { index: number; playerText: string; actions: ActionCode[] }[],
): { worked: WorkedItem[]; killed: WorkedItem[] } {
  const worked: WorkedItem[] = [];
  const killed: WorkedItem[] = [];
  const seen = new Set<string>();

  for (const t of turns) {
    for (const a of t.actions) {
      const label = ACTION_BADGE[a];
      if (!label || seen.has(a)) continue;
      seen.add(a);
      const item: WorkedItem = { text: label, quote: t.playerText };
      if (CONSTRUCTIVE_ACTIONS.includes(a)) {
        if (worked.length < 3) worked.push(item);
      } else if (killed.length < 3) {
        killed.push(item);
      }
    }
  }
  return { worked, killed };
}

/**
 * Picks the turn that cost the most resistance and offers a reformulation.
 * Returns null when nothing went badly enough to be worth rewriting — the
 * debrief then skips the block entirely rather than inventing a lesson.
 */
function buildRewrite(
  turns: { playerText: string; actions: ActionCode[]; deltas: Partial<Record<MetricCode, number>> }[],
): RewriteBlock | null {
  let worst: (typeof turns)[number] | null = null;
  let worstDelta = 0;
  for (const t of turns) {
    const dR = t.deltas.R ?? 0;
    if (dR > worstDelta) {
      worstDelta = dR;
      worst = t;
    }
  }
  if (!worst || worstDelta < 10) return null;

  const HEARD: Partial<Record<ActionCode, string>> = {
    blame: "«Меня назначили виноватым».",
    pressure: "«Со мной не разговаривают, мне приказывают».",
    ignore_emotion: "«То, что я сказал о себе, здесь не важно».",
    mirror_aggression: "«Мы теперь соревнуемся, кто громче».",
    direct_criticism: "«Моя работа не устраивает, а разбираться никто не будет».",
    softness_no_substance: "«Меня успокаивают, но ничего не изменится».",
    postpone_no_deadline: "«Меня опять отложили на потом».",
    postpone_repeat: "«Решения не будет».",
  };
  const COULD: Partial<Record<ActionCode, string>> = {
    blame: "Назвать факт без адресата вины и спросить, что мешало.",
    pressure: "Обозначить рамку и спросить, что реально выполнимо внутри неё.",
    ignore_emotion: "Сначала проговорить услышанное состояние, и только потом переходить к делу.",
    mirror_aggression: "Снизить тон и назвать эмоцию собеседника вслух.",
    direct_criticism: "Опереться на конкретные данные вместо оценки.",
    softness_no_substance: "Добавить конкретный шаг: кто, что и к какому сроку.",
    postpone_no_deadline: "Назвать точный срок, к которому вернётесь с ответом.",
    postpone_repeat: "Зафиксировать хотя бы один пункт прямо сейчас.",
  };

  const action = worst.actions.find((a) => HEARD[a]) ?? worst.actions[0];
  return {
    said: worst.playerText,
    heard: HEARD[action] ?? "«Это мимо меня».",
    couldBe: COULD[action] ?? "Сказать то же самое, опираясь на факт и предложив конкретный шаг.",
  };
}

export async function loadDebrief(sessionId: string): Promise<DebriefData | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { turns: { orderBy: { index: "asc" } } },
  });
  if (!session) return null;

  const level = await requireLevel(session.personaId);
  const { persona, scenario } = level;
  const state = session.state as unknown as SessionState;

  const endReason = endReasonOf(session.status, state.turn, scenario.turnLimit);

  const metricsStart = { ...persona.initialState } as Record<MetricCode, number>;
  const metricsEnd = Object.fromEntries(METRICS.map((m) => [m, state[m]])) as Record<MetricCode, number>;

  const plain = session.turns.map((t) => ({
    index: t.index,
    playerText: t.playerText,
    npcText: t.npcText,
    actions: (t.actions as unknown as ActionCode[]) ?? [],
    deltas: (t.deltas as unknown as Partial<Record<MetricCode, number>>) ?? {},
    stateAfter: t.stateAfter as unknown as SessionState,
  }));

  // Interleave player/NPC turns and mark the pivots: the biggest drop in
  // resistance is where he opened up, the biggest rise is where he was lost.
  let bestDrop = { idx: -1, d: 0 };
  let worstRise = { idx: -1, d: 0 };
  for (const t of plain) {
    const dR = t.deltas.R ?? 0;
    if (dR < bestDrop.d) bestDrop = { idx: t.index, d: dR };
    if (dR > worstRise.d) worstRise = { idx: t.index, d: dR };
  }

  const revealedByTurn = new Map<number, number>();
  let prevRevealed: number[] = [];
  for (const t of plain) {
    const now = t.stateAfter?.revealedLayers ?? [];
    for (const layer of now) {
      if (!prevRevealed.includes(layer)) revealedByTurn.set(t.index, layer);
    }
    prevRevealed = now;
  }

  const timeline: TimelineTurn[] = [];
  for (const t of plain) {
    timeline.push({
      index: t.index,
      speaker: "player",
      text: t.playerText,
      actions: t.actions,
      deltas: t.deltas,
      highlight:
        t.index === bestDrop.idx && bestDrop.d <= -10
          ? { kind: "opened", text: "Здесь он открылся" }
          : t.index === worstRise.idx && worstRise.d >= 10
            ? { kind: "lost", text: "Здесь вы его потеряли" }
            : undefined,
      revealedLayer: revealedByTurn.get(t.index),
    });
    timeline.push({ index: t.index, speaker: "npc", text: t.npcText });
  }

  const layers: HiddenLayerResult[] = persona.hiddenInterests.map((l) => {
    const at = [...revealedByTurn.entries()].find(([, layer]) => layer === l.layer)?.[0];
    return {
      layer: l.layer,
      text: l.text,
      revealedAtTurn: state.revealedLayers.includes(l.layer) ? (at ?? null) : null,
    };
  });

  const { worked, killed } = splitWorkedKilled(plain);

  // «Тот же кейс, другой характер»: раньше сценарий был общим для нескольких
  // персонажей, теперь каждый сценарий отдельная запись, поэтому соседей ищем
  // по совпадению темы.
  const siblings = (await listRuntimeLevels())
    .filter((l) => l.definition.topic === level.definition.topic && l.levelId !== level.levelId)
    .map((l) => l.levelId);

  return {
    sessionId,
    levelId: persona.id,
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    displayName: persona.displayName,
    endReason,
    outcome: computeOutcome(state, scenario),
    verdict: buildVerdict(state, endReason, persona.displayName),
    metricsStart,
    metricsEnd,
    timeline,
    layers,
    worked,
    killed,
    rewrite: buildRewrite(plain),
    quizAnswers: null, // filled client-side from localStorage
    siblingLevelId: siblings[0] ?? null,
  };
}
