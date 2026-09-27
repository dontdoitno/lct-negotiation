import { HistoryTurn, JudgeMetrics } from "./types";

export function formatMetrics(metrics: JudgeMetrics): string {
  return Object.entries(metrics)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
}

export function formatHistory(history: HistoryTurn[], limit = 8): string {
  const recent = history.slice(-limit);
  if (recent.length === 0) return "(это первый ход)";
  return recent.map((t) => `Руководитель: ${t.playerText}\nСотрудник: ${t.npcReply}`).join("\n\n");
}
