"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useFlowState } from "@/lib/flow/store";
import { ROUTES } from "@/lib/flow/routes";

/** На сервере false, после гидратации true. Подписка пустая: значение постоянно. */
const subscribeNothing = () => () => {};

/**
 * Отправляет новичка в опрос перед доской разговоров.
 *
 * Тот, у кого уже есть пройденные попытки, проходит и без ответов: он явно
 * бывал в продукте, и возвращать его назад из-за очищенного localStorage
 * хуже, чем чуть менее точная рекомендация.
 */
export function QuizGuard({ hasProgress }: { hasProgress: boolean }) {
  const { quizCompleted } = useFlowState();
  const router = useRouter();

  // Ответы опроса лежат в браузере, и на первом рендере после гидратации их
  // ещё не видно. Без этой проверки человек, открывший /cases прямой ссылкой,
  // улетал обратно в опрос, хотя давно его прошёл.
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (hydrated && !quizCompleted && !hasProgress) router.replace(ROUTES.quiz);
  }, [hydrated, quizCompleted, hasProgress, router]);

  return null;
}
