"use client";

import { useSyncExternalStore } from "react";

/** Граница, с которой колонка сфер помещается рядом с доской. Совпадает с lg. */
const NARROW = "(max-width: 1023px)";

/**
 * Узкий ли экран.
 *
 * Через `useSyncExternalStore`, а не `useState` с эффектом: на сервере ширины
 * нет, и значение должно совпадать при отрисовке на сервере и на первом кадре
 * в браузере. Иначе React ругается на расхождение, а колонка успевает моргнуть.
 */
export function useIsNarrow(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(NARROW).matches, () => false);
}

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
