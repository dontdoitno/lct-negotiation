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
import { CaseTile } from "./CaseTile";
import { CatalogFilters, FilterState, EMPTY_FILTERS } from "./CatalogFilters";
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
      if (filters.tone && t.tone !== filters.tone) return false;
      if (filters.difficulty && t.difficulty !== filters.difficulty) return false;
      if (filters.onlyUnplayed && t.attempts > 0) return false;
      if (query && !t.title.toLowerCase().includes(query) && !t.topic.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [tiles, filters]);

  /** Сфера, внутри неё тема: группа с одной темой и разными тонами и есть
      та самая матрица «ситуация × характер». */
  const groups = useMemo(() => {
    const byDomain = new Map<string, Map<string, CaseTileData[]>>();
    for (const t of visible) {
      const topics = byDomain.get(t.domain) ?? new Map<string, CaseTileData[]>();
      const list = topics.get(t.topic) ?? [];
      list.push(t);
      topics.set(t.topic, list);
      byDomain.set(t.domain, topics);
    }
    return [...byDomain.entries()].map(([domain, topics]) => ({
      domain,
      topics: [...topics.entries()].map(([topic, items]) => ({ topic, items })),
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
    <main className="mx-auto max-w-wide px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={1} type="display-3">
          {hasProgress ? CASES.progressTitle : CASES.firstTitle}
        </Heading>
        {/* Пункт админки виден только администратору: обычный пользователь не
            должен догадываться, что она существует. */}
        {isAdmin && (
          <Link href="/admin">
            <Button variant="secondary" label={ADMIN.sectionTitle} />
          </Link>
        )}
      </div>

      {hasProgress && accumulated && (
        <div className="mt-6">
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
                      <Button variant="secondary" label="Открыть этот кейс" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Фильтры нужны только когда есть из чего выбирать. */}
      {hasProgress && cases.length > 3 && (
        <div className="mt-7">
          <CatalogFilters cases={cases} value={filters} onChange={setFilters} />
        </div>
      )}

      {visible.length === 0 ? (
        <div className="mt-10">
          <Text as="p" display="block" color="secondary">
            {CASES.nothingFound}
          </Text>
          <div className="mt-3">
            <Button variant="ghost" size="sm" label={CASES.resetFilters} onClick={() => setFilters(EMPTY_FILTERS)} />
          </div>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {groups.map((group) => (
            <section key={group.domain}>
              <Heading level={2}>{group.domain}</Heading>
              <div className="mt-4 flex flex-col gap-6">
                {group.topics.map((t) => (
                  <section key={t.topic}>
                    <Text type="label" color="secondary" display="block">
                      {t.topic}
                    </Text>
                    <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {t.items.map((tile) => (
                        <CaseTile key={tile.levelId} data={tile} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!hasProgress && !flow.quizCompleted && (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Text color="secondary">Мы подобрали разговор наугад.</Text>
          <Button
            variant="ghost"
            size="sm"
            label="Ответьте на три вопроса, чтобы подобрать точнее"
            onClick={() => router.push("/quiz")}
          />
        </div>
      )}
    </main>
  );
}
