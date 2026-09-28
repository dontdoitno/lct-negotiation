"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { RULES } from "@/lib/flow/copy";
import { markRulesSeen } from "@/lib/flow/store";
import { MetricRadar } from "@/components/ui/MetricRadar";
import { StepDots } from "@/components/ui/ProgressBar";

const SWIPE_THRESHOLD_PX = 50;

export default function RulesPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const last = index === RULES.cards.length - 1;
  const card = RULES.cards[index];

  function go(delta: number) {
    setIndex((i) => Math.min(RULES.cards.length - 1, Math.max(0, i + delta)));
  }

  function finish() {
    markRulesSeen();
    router.push("/cases");
  }

  return (
    <main
      className="mx-auto flex min-h-screen max-w-reading flex-col justify-center px-6 py-10"
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > SWIPE_THRESHOLD_PX) go(dx < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
    >
      {/* key= replays the slide-in on each card */}
      <article key={index} className="motion-safe:animate-[rise-in_280ms_ease-out_both]">
        <Heading level={1} type="display-3">
          {card.title}
        </Heading>

        {"text" in card && card.text && (
          <div className="mt-4">
            <Text as="p" display="block" type="large">
              {card.text}
            </Text>
          </div>
        )}

        {"metrics" in card && card.metrics && (
          <>
            <div className="mt-5 flex items-start gap-6">
              <ul className="flex min-w-0 flex-1 flex-col gap-2">
                {card.metrics.map((m) => (
                  <li key={m}>
                    <Text as="p" display="block">
                      {m}
                    </Text>
                  </li>
                ))}
              </ul>
              <div className="hidden shrink-0 sm:block" aria-hidden="true">
                <MetricRadar end={{ A: 70, T: 65, R: 35, I: 75, S: 60, C: 80 }} size={150} />
              </div>
            </div>
            {card.footnote && (
              <div className="mt-5">
                <Text as="p" display="block" type="supporting">
                  {card.footnote}
                </Text>
              </div>
            )}
          </>
        )}
      </article>

      <div className="mt-9 flex items-center justify-between gap-4">
        <StepDots count={RULES.cards.length} active={index} />

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" label={RULES.skip} onClick={finish} />
          {last ? (
            <Button variant="primary" size="lg" label={RULES.finish} onClick={finish} />
          ) : (
            <Button variant="primary" label={RULES.next} onClick={() => go(1)} />
          )}
        </div>
      </div>
    </main>
  );
}
