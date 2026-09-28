"use client";

import { useMemo, useState } from "react";
import { DEBRIEF, ACTION_BADGE } from "@/lib/flow/copy";
import { DebriefData } from "@/lib/flow/types";
import { useFlowState } from "@/lib/flow/store";
import Link from "next/link";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { MetricRadar } from "@/components/ui/MetricRadar";
import { METRIC_META, bucketLabel } from "@/lib/engine/labels";
import { METRIC_ORDER, formatDelta, isFavorable } from "@/lib/call/metricDirection";
import { MetricCode } from "@/lib/engine/types";
import { GuestSaveBlock } from "./GuestSaveBlock";
import { TypeGuessBlock } from "./TypeGuessBlock";
import { TYPE_GUESS } from "@/lib/flow/copy";

/** Three-step verbal scale; `inverse` flips which end is the good one. */
function band(value: number, inverse = false): { text: string; good: boolean } {
  const high = value >= 67;
  const mid = value >= 34;
  const level = high ? "высокая" : mid ? "средняя" : "низкая";
  const good = inverse ? !high : high;
  return { text: level, good };
}

/**
 * The debrief page container is `wide` so the four outcome tiles fit in one
 * row and the radar can sit beside its metric list. Prose blocks would become
 * unreadable at that measure, so by default a section constrains its content
 * to `reading`; the two blocks that genuinely need the width opt out.
 */
function Section({
  title,
  children,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section className="border-t-[1.5px] border-border-strong py-7">
      <Text type="label" color="secondary" display="block">
        {title}
      </Text>
      <div className={`mt-4 ${wide ? "" : "max-w-reading"}`}>{children}</div>
    </section>
  );
}

export function DebriefView({ data }: { data: DebriefData }) {
  const flow = useFlowState();
  const [showAllTurns, setShowAllTurns] = useState(false);

  const outcomeCards = [
    {
      label: DEBRIEF.outcomeLabels.goalAchievement,
      text: data.outcome.goalAchievement >= 67 ? "да" : data.outcome.goalAchievement >= 34 ? "частично" : "нет",
      good: data.outcome.goalAchievement >= 67,
    },
    { label: DEBRIEF.outcomeLabels.employeeSatisfaction, ...band(data.outcome.employeeSatisfaction) },
    { label: DEBRIEF.outcomeLabels.commitmentReadiness, ...band(data.outcome.commitmentReadiness) },
    // Risk is the one where a low reading is the good news.
    {
      label: DEBRIEF.outcomeLabels.conflictRisk,
      text: data.outcome.conflictRisk >= 67 ? "высокий" : data.outcome.conflictRisk >= 34 ? "средний" : "низкий",
      good: data.outcome.conflictRisk < 34,
    },
  ];

  const playerTurns = useMemo(() => data.timeline.filter((t) => t.speaker === "player"), [data.timeline]);

  const visibleTimeline = useMemo(() => {
    if (showAllTurns || data.timeline.length <= 10) return data.timeline;
    // Always keep the first and last exchange plus every highlighted pivot.
    const keep = new Set<number>();
    const first = data.timeline[0]?.index;
    const last = data.timeline[data.timeline.length - 1]?.index;
    if (first !== undefined) keep.add(first);
    if (last !== undefined) keep.add(last);
    for (const t of data.timeline) if (t.highlight || t.revealedLayer) keep.add(t.index);
    return data.timeline.filter((t) => keep.has(t.index));
  }, [data.timeline, showAllTurns]);

  const hiddenCount = data.timeline.length - visibleTimeline.length;

  const personalLine = useMemo(() => {
    const o = flow.quiz.outcome;
    if (!o) return null;
    if (o === "not_followed") {
      return `Вы говорили, что договорённости не выполняются. Вот почему: C остался на уровне «${bucketLabel("C", data.metricsEnd.C)}» — конкретики «кто, что, когда» в разговоре не появилось.`;
    }
    if (o === "conflict") {
      const lost = data.timeline.find((t) => t.highlight?.kind === "lost");
      return lost
        ? `Вы говорили, что разговоры скатываются в конфликт. Смотрите на таймлайн: сопротивление выросло после реплики ${lost.index}.`
        : `Вы говорили, что разговоры скатываются в конфликт. В этом разговоре резкого срыва не было — сопротивление держалось ровно.`;
    }
    const unopened = data.layers.filter((l) => l.revealedAtTurn === null);
    return unopened.length > 0
      ? `Вы говорили, что человек замолкает и непонятно, что не так. Вот его нераскрытые слои — он молчал именно об этом.`
      : `Вы говорили, что человек замолкает и непонятно, что не так. В этот раз вы дошли до всех его слоёв.`;
  }, [flow.quiz.outcome, data]);

  return (
    <main className="mx-auto max-w-wide px-6 pb-16 pt-8">
      <Heading level={1} type="display-3">
        {data.scenarioTitle} · {data.displayName}
      </Heading>

      {/* 0. Тип личности — спрашиваем до разбора: в самом разборе ответ виден */}
      <Section title={TYPE_GUESS.sectionTitle} wide>
        <TypeGuessBlock
          sessionId={data.sessionId}
          trueType={data.personaType}
          trueTypeLabel={data.personaTypeLabel}
        />
      </Section>

      {/* 1. Итог */}
      <Section title={DEBRIEF.outcomeTitle} wide>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {outcomeCards.map((c) => (
            <li key={c.label}>
              <Card>
                <Text type="supporting" display="block">
                  {c.label}
                </Text>
                {/* Colour is doubled by the word itself, per the a11y rule. */}
                <span className={`mt-2 block ${c.good ? "text-metric-trust" : "text-metric-resistance"}`}>
                  <Text type="large" weight="bold" color="inherit" display="block">
                    {c.text}
                  </Text>
                </span>
              </Card>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <Heading level={2} type="display-3">
            {data.verdict}
          </Heading>
        </div>
      </Section>

      {/* 2. Метрики */}
      <Section title={DEBRIEF.metricsTitle} wide>
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="shrink-0">
            <MetricRadar end={data.metricsEnd} start={data.metricsStart} size={220} />
            <div className="mt-2 flex gap-4 text-[12px] text-secondary">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0 w-4 border-t-[1.5px] border-dashed border-disabled" />
                {DEBRIEF.metricsLegendStart}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0 w-4 border-t-2 border-accent" />
                {DEBRIEF.metricsLegendEnd}
              </span>
            </div>
          </div>

          <ul className="min-w-0 flex-1">
            {METRIC_ORDER.map((m: MetricCode) => {
              const from = data.metricsStart[m];
              const to = data.metricsEnd[m];
              const delta = to - from;
              const good = delta === 0 ? true : isFavorable(m, delta);
              return (
                <li key={m} className="flex items-baseline justify-between gap-3 border-b border-border py-2">
                  <span className="text-[15px] text-primary">{METRIC_META[m].label}</span>
                  <span className="shrink-0 text-[14px] text-secondary">
                    {bucketLabel(m, from)} → <span className="text-primary">{bucketLabel(m, to)}</span>
                    {delta !== 0 && (
                      <span className={`ml-2 font-mono text-[12px] ${good ? "text-metric-trust" : "text-metric-resistance"}`}>
                        {formatDelta(delta)}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>

      {/* 3. Таймлайн */}
      <Section title={DEBRIEF.timelineTitle}>
        <ol className="flex flex-col gap-3">
          {visibleTimeline.map((t, i) => (
            <li key={`${t.speaker}-${t.index}-${i}`}>
              {t.highlight && (
                <p
                  className={`mb-2 rounded-md border-[1.5px] px-3 py-2 text-[14px] font-bold ${
                    t.highlight.kind === "opened"
                      ? "border-metric-trust text-metric-trust"
                      : "border-metric-resistance text-metric-resistance"
                  }`}
                >
                  {t.highlight.text}
                </p>
              )}
              <div className={`flex ${t.speaker === "player" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg border-[1.5px] px-3.5 py-2.5 ${
                    t.speaker === "player" ? "border-accent bg-body" : "border-border bg-surface"
                  }`}
                >
                  <Text type="label" color="secondary" display="block">
                    {t.speaker === "player" ? "Вы" : data.displayName} · {t.index}
                  </Text>
                  <div className="mt-1">
                    <Text as="p" display="block">{t.text}</Text>
                  </div>

                  {t.actions && t.actions.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {t.actions.map((a) => (
                        <li
                          key={a}
                          className="rounded-full border border-border px-2 py-0.5 text-[12px] text-secondary"
                        >
                          {ACTION_BADGE[a] ?? a}
                        </li>
                      ))}
                    </ul>
                  )}

                  {t.deltas && Object.keys(t.deltas).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {METRIC_ORDER.filter((m) => t.deltas?.[m]).map((m) => {
                        const d = t.deltas![m]!;
                        return (
                          <span key={m} className={isFavorable(m, d) ? "text-metric-trust" : "text-metric-resistance"}>
                            <Text type="code" color="inherit">
                              {m} {d > 0 ? "↑" : "↓"}
                            </Text>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {t.revealedLayer && (
                    <span className="mt-2 block text-metric-insight">
                      <Text type="supporting" weight="bold" color="inherit" display="block">
                        Раскрыт слой {t.revealedLayer}
                      </Text>
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        {hiddenCount > 0 && (
          <div className="mt-4">
            <Button
              variant="secondary"
              label={`${DEBRIEF.timelineShowAll} (${hiddenCount})`}
              onClick={() => setShowAllTurns(true)}
            />
          </div>
        )}
      </Section>

      {/* 4. Скрытые интересы */}
      <Section title={DEBRIEF.layersTitle}>
        <ol className="flex flex-col gap-2.5">
          {data.layers.map((l) => (
            <li
              key={l.layer}
              className={`rounded-lg border-[1.5px] p-4 ${
                l.revealedAtTurn !== null ? "border-metric-insight bg-body" : "border-border bg-surface"
              }`}
            >
              <Text type="label" color="secondary" display="block">
                Слой {l.layer} ·{" "}
                {l.revealedAtTurn !== null ? DEBRIEF.layerReachedAt(l.revealedAtTurn) : DEBRIEF.layerNotReached}
              </Text>
              {/* Unreached layers are shown in full on purpose — the insight
                  lives in what the player never got to. */}
              <div className="mt-1.5">
                <Text as="p" display="block">{l.text}</Text>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* 5. Что сработало / что убило */}
      <Section title={`${DEBRIEF.workedTitle} / ${DEBRIEF.killedTitle}`}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <span className="block text-metric-trust"><Heading level={3} color="inherit">{DEBRIEF.workedTitle}</Heading></span>
            <ul className="mt-2 flex flex-col gap-2">
              {data.worked.length === 0 && <li className="text-[14px] text-disabled">Нечего отметить.</li>}
              {data.worked.map((w) => (
                <li key={w.text} className="rounded-lg border-[1.5px] border-border p-3">
                  <Text as="p" display="block">{w.text}</Text>
                  {w.quote && (
                    <div className="mt-1 italic">
                      <Text as="p" display="block" type="supporting">«{w.quote}»</Text>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="block text-metric-resistance"><Heading level={3} color="inherit">{DEBRIEF.killedTitle}</Heading></span>
            <ul className="mt-2 flex flex-col gap-2">
              {data.killed.length === 0 && <li className="text-[14px] text-disabled">Ничего разрушительного.</li>}
              {data.killed.map((w) => (
                <li key={w.text} className="rounded-lg border-[1.5px] border-border p-3">
                  <Text as="p" display="block">{w.text}</Text>
                  {w.quote && (
                    <div className="mt-1 italic">
                      <Text as="p" display="block" type="supporting">«{w.quote}»</Text>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* 6. Переписанная реплика — целиком отсутствует, если переписывать нечего */}
      {data.rewrite && (
        <Section title={DEBRIEF.rewriteTitle}>
          <div className="flex flex-col gap-2.5">
            <div className="rounded-lg border-[1.5px] border-border p-4">
              <Text type="label" color="secondary" display="block">{DEBRIEF.rewriteSaid}</Text>
              <div className="mt-1.5"><Text as="p" display="block">«{data.rewrite.said}»</Text></div>
            </div>
            <div className="rounded-lg border-[1.5px] border-border p-4">
              <Text type="label" color="secondary" display="block">{DEBRIEF.rewriteHeard}</Text>
              <div className="mt-1.5"><Text as="p" display="block">{data.rewrite.heard}</Text></div>
            </div>
            <div className="rounded-lg border-2 border-accent bg-body p-4">
              <Text type="label" color="accent" display="block">{DEBRIEF.rewriteCouldBe}</Text>
              <div className="mt-1.5"><Text as="p" display="block" type="large" weight="bold">{data.rewrite.couldBe}</Text></div>
            </div>
          </div>
        </Section>
      )}

      {/* 7. Персональная привязка */}
      {personalLine && (
        <section className="border-t-[1.5px] border-border-strong py-6">
          <div className="max-w-reading"><Text as="p" display="block">{personalLine}</Text></div>
        </section>
      )}

      {/* 9. Гостю — над действиями */}
      {flow.guest && <GuestSaveBlock />}

      {/* 8. Действия */}
      <section className="border-t-[1.5px] border-border-strong pt-7">
        <div className="flex max-w-reading flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href={`/brief/${data.levelId}`}>
            <Button variant="primary" size="lg" label={DEBRIEF.actionsAgain} />
          </Link>
          {data.siblingLevelId && (
            <Link href={`/brief/${data.siblingLevelId}`}>
              <Button variant="secondary" label={DEBRIEF.actionsOtherType} />
            </Link>
          )}
          <Link href="/cases">
            <Button variant="secondary" label={DEBRIEF.actionsNext} />
          </Link>
        </div>
      </section>

      <VisuallyHidden>
        <Text as="p" display="block">
          Всего реплик: {playerTurns.length}. Итог: {data.verdict}
        </Text>
      </VisuallyHidden>
    </main>
  );
}
