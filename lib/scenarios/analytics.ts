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

export async function loadScenarioStats(): Promise<ScenarioStats[]> {
  const [scenarios, sessions] = await Promise.all([
    listScenarios(),
    prisma.session.findMany({
      where: { isTestRun: false, status: { in: ["success", "failed", "timeout"] } },
      select: { personaId: true, status: true, state: true },
    }),
  ]);

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
