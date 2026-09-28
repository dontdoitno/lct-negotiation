"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMotivationOptions } from "@/lib/content/reflectionOptions";

interface TurnSummary {
  index: number;
  playerText: string;
}

export default function ReflectPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [turns, setTurns] = useState<TurnSummary[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [motivationOptions, setMotivationOptions] = useState<readonly string[]>([]);
  const [motivation, setMotivation] = useState<string | null>(null);
  const [breakTurn, setBreakTurn] = useState<number | null>(null);
  const [readiness, setReadiness] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/session/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setTurns(data.turns.map((t: TurnSummary) => ({ index: t.index, playerText: t.playerText })));
        setDisplayName(data.persona.displayName);
        setMotivationOptions(getMotivationOptions(data.scenario.id));
      });
  }, [sessionId]);

  async function submit() {
    setSubmitting(true);
    await fetch(`/api/session/${sessionId}/debrief`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reflectionAnswers: { motivation, breakTurn, readiness },
      }),
    });
    router.push(`/debrief/${sessionId}`);
  }

  const canSubmit = motivation !== null && breakTurn !== null;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-6 rounded-xl border border-line bg-panel p-8">
        <div>
          <span className="label-case text-[11px] text-ink-faint">Прежде чем посмотреть результат</span>
          <h1 className="mt-1 font-display text-xl font-bold text-ink">Три вопроса о разговоре</h1>
        </div>

        <section className="flex flex-col gap-2">
          <p className="text-sm text-ink">1. Чего {displayName || "собеседник"} хотел(а) на самом деле?</p>
          <div className="flex flex-col gap-1.5">
            {motivationOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setMotivation(opt)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  motivation === opt ? "border-gold bg-insight-soft text-ink" : "border-line text-ink-muted hover:border-line-strong"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <p className="text-sm text-ink">2. В какой момент разговор сломался?</p>
          <div className="flex flex-wrap gap-1.5">
            {turns.map((t) => (
              <button
                key={t.index}
                onClick={() => setBreakTurn(t.index)}
                title={t.playerText}
                className={`h-8 w-8 rounded-md border font-mono text-xs transition-colors ${
                  breakTurn === t.index ? "border-gold bg-insight-soft text-ink" : "border-line text-ink-muted hover:border-line-strong"
                }`}
              >
                {t.index}
              </button>
            ))}
            {turns.length === 0 && <span className="text-xs text-ink-faint">Нет ходов для оценки.</span>}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <p className="text-sm text-ink">3. Насколько он(а) готов(а) выполнять договорённости?</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={5}
              value={readiness}
              onChange={(e) => setReadiness(Number(e.target.value))}
              className="flex-1 accent-gold"
            />
            <span className="font-mono text-sm text-ink">{readiness}</span>
          </div>
        </section>

        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="label-case mt-2 rounded-md bg-gold px-6 py-3 text-xs font-semibold text-gold-ink disabled:opacity-40"
        >
          {submitting ? "Считаем…" : "Посмотреть разбор"}
        </button>
      </div>
    </main>
  );
}
