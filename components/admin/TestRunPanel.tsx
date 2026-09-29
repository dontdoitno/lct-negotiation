"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { CallState } from "@/lib/call/reducer";
import { METRIC_META, bucketLabel } from "@/lib/engine/labels";
import { METRIC_ORDER, formatDelta } from "@/lib/call/metricDirection";
import { ACTION_BADGE } from "@/lib/flow/copy";
import { MetricCode } from "@/lib/engine/types";

/**
 * Панель отладки тест-прогона. Всегда открыта: администратор здесь не играет,
 * а проверяет, что настройки сценария дают ожидаемое поведение, и ему нужны
 * числа, а не впечатление.
 */
export function TestRunPanel({ scenarioId, state }: { scenarioId: string; state: CallState }) {
  const router = useRouter();
  const [rawOpen, setRawOpen] = useState(false);
  const [restarting, setRestarting] = useState(false);

  async function restart() {
    setRestarting(true);
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ levelId: scenarioId, testRun: true }),
    });
    if (res.ok) {
      const data = (await res.json()) as { sessionId: string };
      router.push(`/call/${data.sessionId}`);
      router.refresh();
    }
    setRestarting(false);
  }

  async function publish() {
    await fetch(`/api/admin/scenarios/${scenarioId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    router.push("/admin");
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 border-l-[1.5px] border-border bg-surface p-4">
      <div>
        <Heading level={3}>Отладка</Heading>
        <div className="mt-1">
          <Text type="supporting" color="secondary" display="block">
            Ход {state.turn}, осталось реплик {state.turnsLeft}
          </Text>
        </div>
      </div>

      <div>
        <Text type="label" color="secondary" display="block">
          Метрики
        </Text>
        <ul className="mt-1.5 flex flex-col gap-1">
          {METRIC_ORDER.map((m: MetricCode) => {
            const value = state.state?.[m] ?? 0;
            const delta = state.deltas[m];
            return (
              <li key={m} className="flex items-baseline justify-between gap-2">
                <Text type="supporting">{METRIC_META[m].label}</Text>
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-[13px] tabular-nums text-primary">{value}</span>
                  <span className="text-[12px] text-secondary">{bucketLabel(m, value)}</span>
                  {delta !== undefined && delta !== 0 && (
                    <span className="font-mono text-[12px] tabular-nums text-secondary">{formatDelta(delta)}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <Text type="label" color="secondary" display="block">
          Последняя реплика игрока
        </Text>
        {state.debug ? (
          <div className="mt-1.5 flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1">
              {state.debug.actions.length > 0 ? (
                state.debug.actions.map((a) => (
                  <span key={a} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-secondary">
                    {ACTION_BADGE[a] ?? a}
                  </span>
                ))
              ) : (
                <Text type="supporting" color="secondary">
                  действия не распознаны
                </Text>
              )}
            </div>
            <Text type="supporting" color="secondary" display="block">
              {state.debug.rationale}
            </Text>
            {state.debug.revealedLayer !== null && (
              <Text type="supporting" display="block">
                Раскрыт слой {state.debug.revealedLayer}
              </Text>
            )}
          </div>
        ) : (
          <div className="mt-1.5">
            <Text type="supporting" color="secondary">
              Пока ни одной реплики.
            </Text>
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setRawOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-md border border-border px-2 py-1.5 text-left"
        >
          <Text type="supporting" color="secondary">
            Сырой ответ модели
          </Text>
          <Text type="supporting" color="secondary">
            {rawOpen ? "свернуть" : "развернуть"}
          </Text>
        </button>
        {rawOpen && (
          <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-body p-2 font-mono text-[11px] whitespace-pre-wrap text-secondary">
            {state.debug?.rawReply || "—"}
          </pre>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <Button variant="secondary" size="sm" label="Начать заново" isDisabled={restarting} onClick={() => void restart()} />
        <Button
          variant="secondary"
          size="sm"
          label="Вернуться к редактированию"
          onClick={() => router.push(`/admin/scenarios/${scenarioId}/edit`)}
        />
        <Button variant="primary" size="sm" label="Опубликовать" onClick={() => void publish()} />
      </div>
    </aside>
  );
}

/** Плашка над экраном: тест-прогон не должен путаться с обычным прохождением. */
export function TestRunBanner() {
  return (
    <div className="border-b-[1.5px] border-metric-insight bg-surface px-6 py-2">
      <Text type="supporting" display="block">
        Тест-прогон. Прохождение не сохраняется в статистику.
      </Text>
    </div>
  );
}
