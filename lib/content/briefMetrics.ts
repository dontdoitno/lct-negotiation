import { MetricCode } from "@/lib/engine/types";

/**
 * Metric wording for the briefing screen.
 *
 * Deliberately shorter and more player-facing than `METRIC_META` in
 * lib/engine/labels.ts, which labels the live gauges during a call
 * ("Ясность интересов", "Пространство решений"). Here the player is reading
 * cold, before anything has happened, so each one is a plain question about
 * what the system will be watching.
 */
export interface BriefMetric {
  code: MetricCode;
  label: string;
  description: string;
}

export const BRIEF_METRICS: BriefMetric[] = [
  {
    code: "A",
    label: "Адаптация",
    description: "Насколько вы подстраиваетесь под состояние собеседника по ходу разговора.",
  },
  {
    code: "T",
    label: "Доверие",
    description: "Готов ли собеседник говорить с вами открыто.",
  },
  {
    code: "R",
    label: "Сопротивление",
    description: "Как меняется сопротивление собеседника от начала к концу.",
  },
  {
    code: "I",
    label: "Интересы",
    description: "Удалось ли выяснить, что на самом деле важно собеседнику.",
  },
  {
    code: "S",
    label: "Решения",
    description: "Сколько вариантов решения было рассмотрено вместе.",
  },
  {
    code: "C",
    label: "Договорённости",
    description: "Насколько конкретен итог: кто, что и к какому сроку делает.",
  },
];
