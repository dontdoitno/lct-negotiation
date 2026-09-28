"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CallWalkthrough } from "@/components/learn/CallWalkthrough";
import { TaxonomyQuiz } from "@/components/learn/TaxonomyQuiz";
import { CONSTRUCTIVE_ENTRIES, DESTRUCTIVE_ENTRIES, ACTION_LABELS } from "@/lib/content/learnQuiz";

const STEP_LABELS = ["Знакомство", "Интерфейс", "Метрики", "Действия", "Практика", "Готово"];
const ONBOARDING_KEY = "onboarding_done_v1";

export default function LearnPage() {
  const [step, setStep] = useState(0);
  const lastStep = STEP_LABELS.length - 1;

  useEffect(() => {
    if (step === lastStep) localStorage.setItem(ONBOARDING_KEY, "true");
  }, [step, lastStep]);

  function next() {
    setStep((s) => Math.min(lastStep, s + 1));
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="label-case text-[11px] text-ink-faint hover:text-ink-muted">
          ← карта уровней
        </Link>
        <Link href="/" className="label-case text-[11px] text-ink-faint hover:text-ink-muted">
          Пропустить обучение
        </Link>
      </div>

      <div className="flex items-center gap-1.5">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="h-1 w-full rounded-full transition-colors duration-300"
              style={{ background: i <= step ? "var(--color-gold)" : "var(--color-panel-raised)" }}
            />
            <span className={`label-case hidden text-[9px] sm:block ${i === step ? "text-ink" : "text-ink-faint"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="min-h-[60vh] rounded-xl border border-line bg-panel p-6 sm:p-8">
        {step === 0 && <WelcomeStep />}
        {step === 1 && <WalkthroughStep />}
        {step === 2 && <MetricsStep />}
        {step === 3 && <TaxonomyStep />}
        {step === 4 && <QuizStep onDone={next} />}
        {step === 5 && <DoneStep />}
      </div>

      {step !== 4 && (
        <div className="flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className="label-case rounded-md border border-line px-4 py-2.5 text-xs font-semibold text-ink-muted disabled:opacity-0"
          >
            ← Назад
          </button>
          {step < lastStep && (
            <button onClick={next} className="label-case rounded-md bg-gold px-6 py-2.5 text-xs font-semibold text-gold-ink">
              Далее →
            </button>
          )}
        </div>
      )}
    </main>
  );
}

function WelcomeStep() {
  return (
    <div className="flex flex-col gap-4">
      <span className="label-case text-[11px] text-ink-faint">Шаг 1 из 6</span>
      <h1 className="font-display text-2xl font-bold text-ink">Это не чат-бот. Это тренажёр.</h1>
      <p className="text-sm leading-relaxed text-ink-muted">
        Собеседник напротив вас — не языковая модель, которая пытается вам понравиться. Его состояние считает
        детерминированный движок по методологии психолога: одни и те же слова дают один и тот же результат, и
        собеседника нельзя продавить только потому, что модель склонна соглашаться.
      </p>
      <p className="text-sm leading-relaxed text-ink-muted">
        Прежде чем идти в реальный разговор, разберём три вещи: как устроен экран звонка, что значат шесть метрик
        справа, и какие ваши реплики считаются конструктивными, а какие — нет. В конце — короткая практика на
        распознавание, а дальше сразу первый живой разговор.
      </p>
    </div>
  );
}

function WalkthroughStep() {
  return (
    <div className="flex flex-col gap-4">
      <span className="label-case text-[11px] text-ink-faint">Шаг 2 из 6 · Теория</span>
      <h2 className="font-display text-xl font-bold text-ink">Как устроен экран звонка</h2>
      <CallWalkthrough />
    </div>
  );
}

function MetricsStep() {
  return (
    <div className="flex flex-col gap-5">
      <span className="label-case text-[11px] text-ink-faint">Шаг 3 из 6 · Теория</span>
      <h2 className="font-display text-xl font-bold text-ink">Шесть метрик</h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Внутри системы это числа 0–100, но вам показывают только направление. Метрики делятся на две группы, которые
        ведут себя принципиально по-разному.
      </p>

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel-sunken p-4">
        <h3 className="label-case text-[11px] text-resistance">Состояние — меняется в обе стороны каждый ход</h3>
        <MetricRow letter="R" name="Сопротивление" desc="насколько собеседник не принимает ваши аргументы." />
        <MetricRow letter="T" name="Открытость" desc="насколько честно и откровенно он с вами говорит." />
        <MetricRow letter="A" name="Адаптивность" desc="попадаете ли вы приёмами именно в его характер." />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel-sunken p-4">
        <h3 className="label-case text-[11px] text-trust">Прогресс — растёт монотонно, не откатывается</h3>
        <MetricRow letter="I" name="Ясность интересов" desc="поняли ли вы, чего он хочет на самом деле." />
        <MetricRow letter="S" name="Пространство решений" desc="сколько вариантов вы вместе нашли." />
        <MetricRow letter="C" name="Договорённости" desc="есть ли чёткая, зафиксированная конкретика." />
      </div>

      <p className="text-[13px] leading-relaxed text-ink-faint">
        Единственное исключение: договорённости (C) могут упасть — если после фиксации вы снова услышите повторное «я
        подумаю», формальное согласие обнуляется. Раз вскрытый интерес нельзя «забыть», но обещание можно нарушить.
      </p>
    </div>
  );
}

function MetricRow({ letter, name, desc }: { letter: string; name: string; desc: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-5 shrink-0 font-mono text-sm font-semibold text-ink">{letter}</span>
      <span className="text-sm text-ink">
        <span className="font-semibold">{name}</span> — {desc}
      </span>
    </div>
  );
}

function TaxonomyStep() {
  return (
    <div className="flex flex-col gap-5">
      <span className="label-case text-[11px] text-ink-faint">Шаг 4 из 6 · Теория</span>
      <h2 className="font-display text-xl font-bold text-ink">Что засчитывается, а что нет</h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Каждую вашу реплику система классифицирует по закрытому списку действий — не по общему впечатлению «сказал
        что-то хорошее». Вот полный список того, что считается конструктивным и деструктивным.
      </p>

      <div className="flex flex-col gap-2 rounded-lg border border-trust/30 bg-trust-soft p-4">
        <h3 className="label-case text-[11px] text-trust">Конструктивные</h3>
        {CONSTRUCTIVE_ENTRIES.map((e) => (
          <p key={e.code} className="text-[13px] leading-relaxed text-ink">
            <span className="font-semibold">{ACTION_LABELS[e.code]}</span> — {e.what}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-resistance/30 bg-resistance-soft p-4">
        <h3 className="label-case text-[11px] text-resistance">Деструктивные</h3>
        {DESTRUCTIVE_ENTRIES.map((e) => (
          <p key={e.code} className="text-[13px] leading-relaxed text-ink">
            <span className="font-semibold">{ACTION_LABELS[e.code]}</span> — {e.what}
          </p>
        ))}
      </div>

      <p className="text-[13px] leading-relaxed text-ink-faint">
        Важно: одно и то же действие даёт разный эффект на разных типах характера. Мягкость без конкретики тревожному
        безразлична, агрессивный за неё теряет к вам уважение, а рациональный — раздражается сильнее, чем от прямого
        отказа. Один приём не работает универсально — это и есть то, что предстоит проверить на практике.
      </p>
    </div>
  );
}

function QuizStep({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <span className="label-case text-[11px] text-ink-faint">Шаг 5 из 6 · Практика</span>
      <h2 className="font-display text-xl font-bold text-ink">Распознайте действие</h2>
      <TaxonomyQuiz onDone={onDone} />
    </div>
  );
}

function DoneStep() {
  return (
    <div className="flex flex-col gap-4">
      <span className="label-case text-[11px] text-ink-faint">Шаг 6 из 6</span>
      <h2 className="font-display text-2xl font-bold text-ink">Теория закончилась. Дальше только практика.</h2>
      <p className="text-sm leading-relaxed text-ink-muted">
        Начните с рационального типа — он самый предсказуемый, ошибки на нём прощаются, и на нём проще всего
        почувствовать, как реплика превращается в изменение метрики. Первые несколько ходов там будут собственные
        подсказки прямо в разговоре — их можно выключить в любой момент переключателем «Обучающий режим».
      </p>
      <Link
        href="/brief/s1-rational"
        className="label-case mt-2 w-fit rounded-md bg-gold px-6 py-3 text-xs font-semibold text-gold-ink"
      >
        Начать первый разговор →
      </Link>
    </div>
  );
}
