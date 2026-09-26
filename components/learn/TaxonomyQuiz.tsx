"use client";

import { useState } from "react";
import { ACTION_LABELS, QUIZ_ITEMS } from "@/lib/content/learnQuiz";
import { ActionCode } from "@/lib/engine/types";

export function TaxonomyQuiz({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<ActionCode | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const item = QUIZ_ITEMS[index];
  const isLast = index === QUIZ_ITEMS.length - 1;
  const answered = selected !== null;
  const isCorrect = selected === item.correct;

  function choose(code: ActionCode) {
    if (answered) return;
    setSelected(code);
    if (code === item.correct) setCorrectCount((c) => c + 1);
  }

  function next() {
    if (isLast) {
      onDone();
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="label-case text-[11px] text-ink-muted">
          Вопрос {index + 1} из {QUIZ_ITEMS.length}
        </span>
        <span className="font-mono text-xs text-ink-faint">Верно: {correctCount}</span>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-line bg-panel-sunken p-4">
        {item.context && <p className="text-xs text-ink-faint">{item.context}</p>}
        <p className="text-base text-ink">{item.line}</p>
      </div>

      <p className="text-sm text-ink-muted">Что это за действие руководителя?</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {item.options.map((code) => {
          const isSelected = selected === code;
          const isTheCorrectOne = answered && code === item.correct;
          const isWrongPick = answered && isSelected && code !== item.correct;
          return (
            <button
              key={code}
              onClick={() => choose(code)}
              disabled={answered}
              className={`rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                isTheCorrectOne
                  ? "border-trust bg-trust-soft text-ink"
                  : isWrongPick
                    ? "border-resistance bg-resistance-soft text-ink"
                    : "border-line text-ink-muted hover:border-line-strong disabled:hover:border-line"
              }`}
            >
              {ACTION_LABELS[code] ?? code}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={`rise-in rounded-md border px-3 py-2.5 text-[13px] leading-relaxed ${
            isCorrect ? "border-trust/40 bg-trust-soft text-ink" : "border-resistance/40 bg-resistance-soft text-ink"
          }`}
        >
          <span className="font-semibold">{isCorrect ? "Верно. " : "Не совсем. "}</span>
          {item.explanation}
        </div>
      )}

      {answered && (
        <button
          onClick={next}
          className="label-case ml-auto rounded-md bg-accent px-5 py-2.5 text-xs font-semibold text-accent-ink"
        >
          {isLast ? "Завершить" : "Следующий вопрос →"}
        </button>
      )}
    </div>
  );
}
