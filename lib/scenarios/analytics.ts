import { prisma } from "@/lib/db";
import { MetricCode, SessionState } from "@/lib/engine/types";
import { listScenarios } from "./repository";

/**
 * Сводка по сценариям. Тест-прогоны администратора исключены везде: иначе
 * собственная отладка портила бы статистику, ради которой экран и нужен.
 */

export interface ScenarioStats {
  id: string;
  title: string;
  status: string;
  playthroughs: number;
  averageMetrics: Partial<Record<MetricCode, number>>;
  outcomes: { success: number; timeout: number; failed: number };
  /** Средний номер реплики, на которой разговор срывается. Null, если срывов не было. */
  averageBreakTurn: number | null;
}

const METRICS: MetricCode[] = ["A", "T", "R", "I", "S", "C"];

/**
 * Статистика по сценариям в рамках одной компании.
 *
 * Организация обязательна: без неё HR видел бы прохождения чужих сотрудников.
 * В выборку попадают только сессии людей своей компании и только сценарии,
 * доступные ей — общие плюс собственные.
 */
export async function loadScenarioStats(organizationId: string): Promise<ScenarioStats[]> {
  const members = await prisma.user.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const memberIds = members.map((m) => m.id);

  const [all, sessions] = await Promise.all([
    listScenarios(),
    prisma.session.findMany({
      where: {
        userId: { in: memberIds },
        isTestRun: false,
        status: { in: ["success", "failed", "timeout", "stopped"] },
      },
      select: { personaId: true, status: true, state: true },
    }),
  ]);

  const scenarios = all.filter((s) => !s.organizationId || s.organizationId === organizationId);

  return scenarios.map((scenario) => {
    const own = sessions.filter((s) => s.personaId === scenario.id);

    const averageMetrics: Partial<Record<MetricCode, number>> = {};
    for (const m of METRICS) {
      const values = own
        .map((s) => (s.state as unknown as SessionState | null)?.[m])
        .filter((v): v is number => typeof v === "number");
      if (values.length) {
        averageMetrics[m] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      }
    }

    const failed = own.filter((s) => s.status === "failed");
    const breakTurns = failed
      .map((s) => (s.state as unknown as SessionState | null)?.turn)
      .filter((v): v is number => typeof v === "number");

    return {
      id: scenario.id,
      title: scenario.title,
      status: scenario.status,
      playthroughs: own.length,
      averageMetrics,
      outcomes: {
        success: own.filter((s) => s.status === "success").length,
        timeout: own.filter((s) => s.status === "timeout").length,
        failed: failed.length,
      },
      averageBreakTurn: breakTurns.length
        ? Math.round((breakTurns.reduce((a, b) => a + b, 0) / breakTurns.length) * 10) / 10
        : null,
    };
  });
}
