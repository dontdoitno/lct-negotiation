import { Heading, Text } from "@astryxdesign/core/Text";
import { loadScenarioStats } from "@/lib/scenarios/analytics";
import { METRIC_META } from "@/lib/engine/labels";
import { MetricCode } from "@/lib/engine/types";

export const dynamic = "force-dynamic";

const METRICS: MetricCode[] = ["A", "T", "R", "I", "S", "C"];

export default async function AnalyticsPage() {
  const stats = await loadScenarioStats();
  const anyPlaythroughs = stats.some((s) => s.playthroughs > 0);

  return (
    <main className="mx-auto max-w-wide px-6 py-8">
      <Heading level={1} type="display-3">
        Аналитика
      </Heading>
      <div className="mt-2">
        <Text as="p" display="block" color="secondary">
          Только настоящие прохождения. Тест-прогоны из админки в статистику не попадают.
        </Text>
      </div>

      {!anyPlaythroughs ? (
        <div className="mt-8">
          <Text as="p" display="block" color="secondary">
            Пока ни одного завершённого разговора.
          </Text>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border-[1.5px] border-border bg-surface">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-border">
                <th className="px-3 py-2 text-left"><Text type="label" color="secondary">Сценарий</Text></th>
                <th className="px-3 py-2 text-right"><Text type="label" color="secondary">Прохождений</Text></th>
                <th className="px-3 py-2 text-left"><Text type="label" color="secondary">Средние метрики</Text></th>
                <th className="px-3 py-2 text-left"><Text type="label" color="secondary">Чем закончилось</Text></th>
                <th className="px-3 py-2 text-right"><Text type="label" color="secondary">Срыв на реплике</Text></th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2"><Text type="supporting">{s.title}</Text></td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono text-[13px] tabular-nums">{s.playthroughs}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {METRICS.filter((m) => s.averageMetrics[m] !== undefined).map((m) => (
                        <span key={m} className="text-[12px] text-secondary">
                          {METRIC_META[m].short}{" "}
                          <span className="font-mono tabular-nums text-primary">{s.averageMetrics[m]}</span>
                        </span>
                      ))}
                      {Object.keys(s.averageMetrics).length === 0 && <Text type="supporting" color="secondary">—</Text>}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Text type="supporting" color="secondary">
                      договорились {s.outcomes.success} · время вышло {s.outcomes.timeout} · ушёл {s.outcomes.failed}
                    </Text>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono text-[13px] tabular-nums text-secondary">
                      {s.averageBreakTurn ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
