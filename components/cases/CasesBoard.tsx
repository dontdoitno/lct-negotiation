"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CaseBase } from "@/lib/flow/cases";
import { CaseTileData } from "@/lib/flow/types";
import { ADMIN, CASES } from "@/lib/flow/copy";
import { matchLevelFromQuiz, suggestNextStep } from "@/lib/flow/matching";
import { useFlowState } from "@/lib/flow/store";
import { DomainRail } from "./DomainRail";
import { TopicRow } from "./TopicRow";
import { FilterState, EMPTY_FILTERS } from "./filters";
import { useIsNarrow } from "@/lib/ui/useIsNarrow";
import { DIRECTION_ORDER, DIRECTION_PRESETS, DirectionId } from "@/lib/scenarios/directions";
import { MetricRadar } from "@/components/ui/MetricRadar";
import { MetricCode } from "@/lib/engine/types";

const METRICS: MetricCode[] = ["A", "T", "R", "I", "S", "C"];

/**
 * Каталог разговоров. Сценарии приходят из базы, их число заранее неизвестно,
 * поэтому вместо фиксированной сетки — группировка по сфере и теме плюс
 * фильтры и поиск сверху.
 *
 * Первый заход выглядит иначе: открыт ровно один подобранный по опросу
 * разговор, остальные закрыты. После первого пройденного доска открывается
 * целиком, а над ней появляется сводка и подсказка, что взять дальше.
 */
export function CasesBoard({ cases, isAdmin }: { cases: CaseBase[]; isAdmin: boolean }) {
  const flow = useFlowState();
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  // На узком экране раскрытая колонка сфер занимает половину ширины, поэтому
  // там она по умолчанию свёрнута. Ручной выбор пользователя важнее: как только
  // он нажал на сворачивание, дальше решает он.
  const narrow = useIsNarrow();
  const [railChoice, setRailChoice] = useState<boolean | null>(null);
  const railCollapsed = railChoice ?? narrow;
  const setRailCollapsed = (next: boolean) => setRailChoice(next);

  const finished = useMemo(() => cases.filter((c) => c.attempts > 0), [cases]);
  const hasProgress = finished.length > 0;

  const recommendedId = useMemo(
    () => matchLevelFromQuiz(flow.quiz, cases.map((c) => c.levelId)),
    [flow.quiz, cases],
  );

  const tiles: CaseTileData[] = useMemo(
    () =>
      cases.map((c) => ({
        levelId: c.levelId,
        callNumber: c.callNumber,
        title: c.title,
        domain: c.domain,
        topic: c.topic,
        direction: c.direction,
        assigned: c.assigned,
        dueAt: c.dueAt ? c.dueAt.toISOString() : null,
        tone: c.tone,
        difficulty: c.difficulty,
        personaType: c.personaType,
        displayName: c.displayName,
        attempts: c.attempts,
        bestMetrics: c.bestMetrics,
        state: hasProgress
          ? c.attempts > 0
            ? "completed"
            : "available"
          : c.levelId === recommendedId
            ? "recommended"
            : "locked",
      })),
    [cases, hasProgress, recommendedId],
  );

  const visible = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return tiles.filter((t) => {
      if (filters.domain && t.domain !== filters.domain) return false;
      if (filters.difficulty && t.difficulty !== filters.difficulty) return false;
      if (filters.onlyUnplayed && t.attempts > 0) return false;
      if (query && !t.title.toLowerCase().includes(query) && !t.topic.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [tiles, filters]);

  /**
   * Группы по направлению разговора: вниз, вверх, вбок, медиация, топ.
   *
   * Раньше каталог делился по темам, но тема говорит только о чём разговор.
   * Направление говорит, у кого власть, а от этого зависит, какие приёмы
   * работают: на равного приказ не действует, со старшим нужны факты.
   * Порядок фиксированный, от привычного руководителю к непривычному.
   */
  const groups = useMemo(() => {
    const map = new Map<DirectionId, CaseTileData[]>();
    for (const t of visible) {
      const list = map.get(t.direction) ?? [];
      list.push(t);
      map.set(t.direction, list);
    }
    return DIRECTION_ORDER.filter((d) => map.has(d)).map((d) => ({
      id: d,
      title: DIRECTION_PRESETS[d].label,
      hint: DIRECTION_PRESETS[d].hint,
      items: map.get(d)!,
    }));
  }, [visible]);

  const accumulated = useMemo(() => {
    if (!hasProgress) return null;
    const acc: Partial<Record<MetricCode, number>> = {};
    for (const m of METRICS) {
      const vals = finished.map((c) => c.bestMetrics?.[m]).filter((v): v is number => typeof v === "number");
      if (vals.length) acc[m] = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    }
    return acc;
  }, [finished, hasProgress]);

  const suggestion = useMemo(
    () =>
      suggestNextStep(
        finished.map((c) => ({ levelId: c.levelId, metrics: c.bestMetrics ?? {} })),
        cases.map((c) => ({ levelId: c.levelId, personaType: c.personaType, scenarioTitle: c.topic })),
      ),
    [finished, cases],
  );

  // Ни одного опубликованного сценария: пользователю сообщаем факт,
  // администратору — куда идти.
  if (cases.length === 0) {
    return (
      <main className="mx-auto max-w-reading px-6 py-16">
        <Heading level={1} type="display-3">
          {CASES.emptyTitle}
        </Heading>
        <div className="mt-3">
          <Text as="p" display="block" color="secondary">
            {isAdmin ? CASES.emptyAdminHint : CASES.emptyUserHint}
          </Text>
        </div>
        {isAdmin && (
          <div className="mt-6">
            <Link href="/admin/scenarios/new">
              <Button variant="primary" size="lg" label={CASES.emptyAdminCta} />
            </Link>
          </div>
        )}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-body lg:flex-row">
      <DomainRail
        cases={cases}
        value={filters}
        onChange={setFilters}
        collapsed={railCollapsed}
        onToggle={() => setRailCollapsed(!railCollapsed)}
      />

      {/* Своя область прокрутки нужна только там, где колонка сфер стоит
          сбоку и должна оставаться на месте. На телефоне прокручивается сама
          страница: вложенный скролл там ломает скрытие адресной строки. */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:h-screen lg:overflow-y-auto lg:scroll-smooth lg:px-10 lg:py-8">
        <div className="mx-auto flex max-w-wide flex-col gap-8">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Text type="supporting" color="secondary" display="block">
                {filters.domain ?? CASES.allDomains}
              </Text>
              <div className="mt-1">
                <Heading level={1} type="display-2">
                  {hasProgress ? CASES.progressTitle : CASES.firstTitle}
                </Heading>
              </div>
            </div>
            {/* Пункт админки виден только администратору: обычный пользователь
                не должен догадываться, что она существует. */}
            {isAdmin && (
              <Link href="/admin">
                <Button variant="secondary" label={ADMIN.sectionTitle} />
              </Link>
            )}
          </header>

          {/* Объяснение закрытых карточек один раз над доской. На широком
              экране оно стоит на самих карточках и здесь не нужно. */}
          {!hasProgress && (
            <div className="-mt-4 sm:hidden">
              <Text type="supporting" color="secondary" display="block">
                {CASES.lockedBoardNote}
              </Text>
            </div>
          )}

          {hasProgress && accumulated && (
            <Card>
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <MetricRadar end={accumulated} size={180} />
                {suggestion && (
                  <div className="min-w-0">
                    <Text type="label" color="secondary" display="block">
                      {CASES.nextStepTitle}
                    </Text>
                    <div className="mt-2">
                      <Text as="p" display="block" type="large">
                        {suggestion.text}
                      </Text>
                    </div>
                    <div className="mt-4">
                      <Link href={`/brief/${suggestion.levelId}`}>
                        <Button variant="secondary" label={CASES.openThisCase} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {groups.length === 0 ? (
            <div className="py-10">
              <Text as="p" display="block" color="secondary">
                {CASES.nothingFound}
              </Text>
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  label={CASES.resetFilters}
                  onClick={() => setFilters(EMPTY_FILTERS)}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {groups.map((group) => (
                <TopicRow
                  key={group.id}
                  topic={group.title}
                  hint={group.hint}
                  items={group.items}
                />
              ))}
            </div>
          )}

          {!hasProgress && !flow.quizCompleted && (
            <div className="flex flex-wrap items-center gap-2 pb-6">
              <Text color="secondary">{CASES.randomPick}</Text>
              <Button
                variant="ghost"
                size="sm"
                label={CASES.refinePick}
                onClick={() => router.push("/quiz")}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
