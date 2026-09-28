"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Text, Heading } from "@astryxdesign/core/Text";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Button } from "@astryxdesign/core/Button";
import { QUIZ } from "@/lib/flow/copy";
import { QuizAnswers } from "@/lib/flow/types";
import { completeQuiz, setQuizAnswer, useFlowState } from "@/lib/flow/store";

const STEPS = ["role", "topic", "outcome"] as const;
type StepKey = (typeof STEPS)[number];

export default function QuizPage() {
  const router = useRouter();
  const flow = useFlowState();
  const [step, setStep] = useState(0);

  const key: StepKey = STEPS[step];
  const question = QUIZ.questions[key];
  const selected = flow.quiz[key];
  const isLast = step === STEPS.length - 1;

  /**
   * Selecting no longer advances on its own. Auto-advance meant re-picking the
   * value you already had did nothing at all — the screen just sat there —
   * while picking any other option jumped forward before you could read it.
   * Choosing and confirming are now two separate actions.
   */
  function select(value: string) {
    setQuizAnswer(key, value as QuizAnswers[StepKey]);
  }

  function next() {
    if (!selected) return;
    if (isLast) {
      completeQuiz();
      router.push("/signup");
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-reading flex-col justify-center px-6 py-10">
      <Text type="label" color="secondary" as="p">
        {QUIZ.stepTitle}
      </Text>

      <div className="mt-5 flex items-center gap-4">
        <Text type="code" color="secondary" hasTabularNumbers>
          {QUIZ.progress(step + 1, STEPS.length)}
        </Text>
        <div className="flex-1">
          <ProgressBar
            value={((step + 1) / STEPS.length) * 100}
            label={QUIZ.progress(step + 1, STEPS.length)}
            isLabelHidden
          />
        </div>
      </div>

      {/* key= restarts the enter animation on each question */}
      <div key={key} className="mt-8 motion-safe:animate-[rise-in_280ms_ease-out_both]">
        <Heading level={1} type="display-3">
          {question.title}
        </Heading>

        <div className="mt-6 flex flex-col gap-3" role="group" aria-label={question.title}>
          {question.options.map((o) => (
            <SelectableCard
              key={o.value}
              label={o.label}
              isSelected={selected === o.value}
              onChange={() => select(o.value)}
              padding={4}
            >
              <Text type="large" color="inherit">
                {o.label}
              </Text>
            </SelectableCard>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        {step > 0 ? (
          <Button variant="ghost" label={`← ${QUIZ.back}`} onClick={() => setStep((s) => s - 1)} />
        ) : (
          <span />
        )}
        <Button
          variant="primary"
          size="lg"
          label={isLast ? "Готово" : "Далее →"}
          isDisabled={!selected}
          onClick={next}
        />
      </div>
    </main>
  );
}
