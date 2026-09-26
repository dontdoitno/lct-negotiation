"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

const ONBOARDING_KEY = "onboarding_done_v1";

function subscribe() {
  // localStorage doesn't change from outside this tab during the component's
  // lifetime, so there's nothing to subscribe to — just satisfy the hook's shape.
  return () => {};
}

function getSnapshot() {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

function getServerSnapshot() {
  return false;
}

export function LearnBanner() {
  const done = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <Link
      href="/learn"
      className="group flex items-center justify-between gap-4 rounded-lg border border-line bg-panel p-4 transition-colors hover:border-line-strong"
    >
      <div className="flex flex-col gap-1">
        <span className="label-case text-[10px] text-insight">{done ? "Пройдено" : "Начните отсюда"}</span>
        <span className="font-display text-base font-semibold text-ink">
          Обучение: онбординг, теория и практика распознавания
        </span>
        <span className="text-xs text-ink-muted">
          Как устроен звонок, что значат метрики, какие реплики считаются конструктивными — 5 минут до первого
          разговора.
        </span>
      </div>
      <span className="label-case shrink-0 text-xs text-ink-faint group-hover:text-ink-muted">
        {done ? "Повторить →" : "Пройти →"}
      </span>
    </Link>
  );
}
