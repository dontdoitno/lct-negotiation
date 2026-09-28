"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFlowState } from "@/lib/flow/store";
import { ROUTES } from "@/lib/flow/routes";

/**
 * Sends a first-time visitor to the quiz before the cases board.
 *
 * Someone who already has finished attempts is let through even without quiz
 * answers: they have plainly been through the flow, and bouncing them back
 * because localStorage was cleared would be worse than a slightly less
 * tailored recommendation.
 */
export function QuizGuard({ hasProgress }: { hasProgress: boolean }) {
  const { quizCompleted } = useFlowState();
  const router = useRouter();

  useEffect(() => {
    if (!quizCompleted && !hasProgress) router.replace(ROUTES.quiz);
  }, [quizCompleted, hasProgress, router]);

  return null;
}
