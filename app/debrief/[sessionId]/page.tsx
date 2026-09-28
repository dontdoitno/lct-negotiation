"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CORRECT_MOTIVATION_BY_PERSONA } from "@/lib/content/reflectionOptions";

interface DebriefPayload {
  sessionId: string;
  scenario: { id: string; title: string };
  persona: { id: string; displayName: string; typeLabel: string; type: string };
  ending: "success" | "failed" | "timeout";
  stars: number;
  outcome: { goalAchievement: number; employeeSatisfaction: number; commitmentReadiness: number; conflictRisk: number };
  hiddenFailure: boolean;
  finalState: { R: number; T: number; I: number; S: number; C: number; A: number };
  revealedInterests: { layer: number; text: string }[];
  lockedInterests: { layer: number; trustThreshold: number }[];
  breakpoints: number[];
  recommendations: string[];
  timeline: {
    index: number;
    playerText: string;
    npcText: string;
    actions: string[];
    deltas: Record<string, number>;
    rationale: string;
    isBreakpoint: boolean;
  }[];
  reflectionAnswers: { motivation: string; breakTurn: number; readiness: number } | null;
}

const ENDING_LABEL: Record<string, string> = { success: "Успех", failed: "Срыв", timeout: "Лимит ходов" };

export default function DebriefPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [data, setData] = useState<DebriefPayload | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/session/${sessionId}/debrief`)
      .then((r) => r.json())
      .then(setData);
  }, [sessionId]);

  async function replayFrom(branchTurn: number) {
    const res = await fetch(`/api/session/${sessionId}/replay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchTurn }),
    });
    const json = await res.json();
    router.push(`/call/${json.sessionId}`);
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-muted">
        <span className="label-case text-xs">Готовим разбор…</span>
      </div>
    );
  }

  const correctMotivation = CORRECT_MOTIVATION_BY_PERSONA[data.persona.id];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <Link href="/" className="label-case w-fit text-[11px] text-ink-faint hover:text-ink-muted">
          ← карта уровней
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-ink">Разбор разговора</h1>
          <div className="flex gap-0.5 text-xl">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < data.stars ? "text-gold" : "text-line-strong"}>
                ★
              </span>
            ))}
          </div>
        </div>
        <p className="text-sm text-ink-muted">
          {data.scenario.title} · {data.persona.displayName} ({data.persona.typeLabel}) · итог:{" "}
          <span className="text-ink">{ENDING_LABEL[data.ending] ?? data.ending}</span>
        </p>
      </header>

      {data.hiddenFailure && (
        <section className="rounded-lg border border-resistance/40 bg-resistance-soft p-5">
          <h2 className="font-display text-base font-semibold text-resistance">Он согласился, но не поверил вам.</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            Формально договорённости есть. Но открытость осталась низкой: он не сказал, что происходит на самом деле, и
            согласился, чтобы разговор закончился. Риск увольнения — {data.outcome.conflictRisk}%.
          </p>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <OutcomeCard label="Цели достигнуты" value={data.outcome.goalAchievement} />
        <OutcomeCard label="Удовлетворённость" value={data.outcome.employeeSatisfaction} />
        <OutcomeCard label="Готовность выполнять" value={data.outcome.commitmentReadiness} />
        <OutcomeCard label="Риск конфликта" value={data.outcome.conflictRisk} inverse />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="label-case text-[11px] text-ink-muted">Таймлайн разговора</h2>
        <div className="flex flex-col gap-2">
          {data.timeline.map((t) => (
            <div key={t.index} className={`rounded-md border p-3 ${t.isBreakpoint ? "border-resistance/40 bg-resistance-soft" : "border-line bg-panel"}`}>
              <button className="flex w-full items-center justify-between text-left" onClick={() => setExpanded(expanded === t.index ? null : t.index)}>
                <span className="flex items-center gap-2 text-sm text-ink">
                  <span className="font-mono text-xs text-ink-faint">#{t.index}</span>
                  {t.isBreakpoint && <span className="label-case text-[10px] text-resistance">перелом</span>}
                  <span className="truncate">{t.playerText}</span>
                </span>
                <span className="font-mono text-xs text-ink-faint">{expanded === t.index ? "▲" : "▼"}</span>
              </button>
              {expanded === t.index && (
                <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3 text-sm">
                  <p className="text-ink-muted">
                    Классифицировано как: <span className="font-mono text-ink">{t.actions.join(", ")}</span>
                  </p>
                  <p className="text-ink">{t.rationale}</p>
                  <p className="text-ink-muted">
                    Изменения:{" "}
                    {Object.entries(t.deltas)
                      .map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`)
                      .join(", ") || "без изменений"}
                  </p>
                  <p className="italic text-ink-muted">«{t.npcText}»</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="label-case text-[11px] text-ink-muted">Гипотезы против реальности</h2>
        <div className="grid gap-3 rounded-lg border border-line bg-panel p-4 text-sm md:grid-cols-2">
          {data.reflectionAnswers && (
            <>
              <div>
                <p className="text-ink-muted">Ваша гипотеза о мотивации:</p>
                <p className={data.reflectionAnswers.motivation === correctMotivation ? "text-trust" : "text-ink"}>
                  {data.reflectionAnswers.motivation}
                </p>
              </div>
              <div>
                <p className="text-ink-muted">На самом деле:</p>
                <p className="text-insight">{correctMotivation}</p>
              </div>
            </>
          )}
          <div className="md:col-span-2">
            <p className="mb-2 text-ink-muted">Карта скрытых интересов:</p>
            <ul className="flex flex-col gap-1">
              {data.revealedInterests.map((l) => (
                <li key={l.layer} className="text-trust">
                  ✓ Слой {l.layer}: «{l.text}»
                </li>
              ))}
              {data.lockedInterests.map((l) => (
                <li key={l.layer} className="text-ink-faint">
                  ○ Слой {l.layer}: не раскрыт (нужен доверие ≥ {l.trustThreshold})
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="label-case text-[11px] text-ink-muted">Рекомендации</h2>
        <div className="flex flex-col gap-2">
          {data.recommendations.map((r, i) => (
            <div key={i} className="rounded-md border border-line bg-panel p-4 text-sm leading-relaxed text-ink">
              {r}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-3 border-t border-line pt-6">
        {data.breakpoints.map((bp) => (
          <button
            key={bp}
            onClick={() => replayFrom(bp)}
            className="label-case rounded-md border border-line-strong px-4 py-2.5 text-xs font-semibold text-ink hover:border-gold"
          >
            Переиграть с хода {bp}
          </button>
        ))}
        <Link
          href={`/brief/${data.persona.id}`}
          className="label-case rounded-md bg-gold px-4 py-2.5 text-xs font-semibold text-gold-ink"
        >
          Пройти заново
        </Link>
      </section>
    </main>
  );
}

function OutcomeCard({ label, value, inverse }: { label: string; value: number; inverse?: boolean }) {
  const good = inverse ? value < 40 : value >= 60;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line bg-panel p-3">
      <span className="label-case text-[10px] text-ink-muted">{label}</span>
      <span className="font-display text-2xl font-bold" style={{ color: good ? "var(--color-trust)" : "var(--color-resistance)" }}>
        {value}%
      </span>
    </div>
  );
}
