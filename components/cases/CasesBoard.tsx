"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CaseBase } from "@/lib/flow/cases";
import { CaseTileData } from "@/lib/flow/types";
import { CASES } from "@/lib/flow/copy";
import { matchLevelFromQuiz, suggestNextStep } from "@/lib/flow/matching";
import { useFlowState } from "@/lib/flow/store";
import Link from "next/link";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CaseTile } from "./CaseTile";
import { MetricRadar } from "@/components/ui/MetricRadar";
import { MetricCode } from "@/lib/engine/types";

const METRICS: MetricCode[] = ["A", "T", "R", "I", "S", "C"];

/**
 * One screen, two states: a first visit shows exactly one unlocked case (the
 * one the quiz picked), everything else locked; once anything is finished the
 * whole board opens and a summary with a next-step suggestion appears above it.
 */
export function CasesBoard({ cases }: { cases: CaseBase[] }) {
  const flow = useFlowState();
  const router = useRouter();

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
        scenarioId: c.scenarioId,
        scenarioTitle: c.scenarioTitle,
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
        cases.map((c) => ({ levelId: c.levelId, personaType: c.personaType, scenarioTitle: c.scenarioTitle })),
      ),
    [finished, cases],
  );

  // Group by scenario so the <900px layout can show real section headings
  // instead of a flat list.
  const byScenario = useMemo(() => {
    const map = new Map<string, { title: string; tiles: CaseTileData[] }>();
    for (const t of tiles) {
      const g = map.get(t.scenarioId) ?? { title: t.scenarioTitle, tiles: [] };
      g.tiles.push(t);
      map.set(t.scenarioId, g);
    }
    return [...map.values()];
  }, [tiles]);

  return (
    <main className="mx-auto max-w-wide px-6 py-10">
      <Heading level={1} type="display-3">
        {hasProgress ? CASES.progressTitle : CASES.firstTitle}
      </Heading>

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

      <div className="mt-8 flex flex-col gap-8">
        {byScenario.map((group) => (
          <section key={group.title}>
            <Text type="label" color="secondary" display="block">
              {group.title}
            </Text>
            <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.tiles.map((t) => (
                <CaseTile key={t.levelId} data={t} />
              ))}
            </ul>
          </section>
        ))}
      </div>

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
