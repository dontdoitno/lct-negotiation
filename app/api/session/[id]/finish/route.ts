import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScenarioById } from "@/lib/scenarios/runtime";
import { checkEnding } from "@/lib/engine/endings";
import { SessionState } from "@/lib/engine/types";
import { incrementPlaythroughCount } from "@/lib/scenarios/repository";

/**
 * Завершение разговора по кнопке игрока.
 *
 * Раньше кнопка только перебрасывала на разбор, а сессия навсегда оставалась
 * в статусе `active`. Из-за этого разговор не засчитывался попыткой, доска
 * кейсов не открывалась и счётчик прохождений не рос: со стороны выглядело
 * так, будто кнопка не работает.
 *
 * Роут идемпотентный. Повторное нажатие и гонка с последней репликой модели
 * не меняют уже проставленный статус и не накручивают счётчик прохождений.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Уже завершена: отвечаем тем же, что и в первый раз.
  if (session.status !== "active") {
    return NextResponse.json({ status: session.status, alreadyFinished: true });
  }

  const scenario = await getScenarioById(session.scenarioId);
  const state = session.state as unknown as SessionState;

  // Если к этому ходу разговор и так пришёл к финалу, сохраняем настоящий
  // исход. «Остановлен игроком» ставим только когда финала ещё не было.
  const status = checkEnding(state, scenario) ?? "stopped";

  // updateMany с условием status: active — защита от гонки: если параллельный
  // запрос хода успел закрыть сессию, здесь обновится ноль строк.
  const updated = await prisma.session.updateMany({
    where: { id, status: "active" },
    data: { status, finishedAt: new Date() },
  });

  if (updated.count === 0) {
    const fresh = await prisma.session.findUnique({ where: { id }, select: { status: true } });
    return NextResponse.json({ status: fresh?.status ?? status, alreadyFinished: true });
  }

  if (!session.isTestRun) await incrementPlaythroughCount(session.personaId);

  return NextResponse.json({ status, alreadyFinished: false });
}
