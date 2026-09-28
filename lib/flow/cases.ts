import { prisma } from "@/lib/db";
import { listLevels } from "@/lib/content/loader";
import { MetricCode, SessionState } from "@/lib/engine/types";
import { PersonaType } from "./matching";

export interface CaseBase {
  levelId: string;
  /** Stable 1-based ordinal shown instead of the persona type. */
  callNumber: number;
  scenarioId: string;
  scenarioTitle: string;
  personaType: PersonaType;
  displayName: string;
  attempts: number;
  /** Best finished attempt per metric; null when nothing is finished yet. */
  bestMetrics: Partial<Record<MetricCode, number>> | null;
}

const METRICS: MetricCode[] = ["A", "T", "R", "I", "S", "C"];

/** Lower resistance is the better result, so "best" flips for R. */
function better(metric: MetricCode, a: number, b: number) {
  return metric === "R" ? Math.min(a, b) : Math.max(a, b);
}

export async function loadCases(userId: string): Promise<CaseBase[]> {
  const levels = listLevels();

  const finished = await prisma.session.findMany({
    where: { userId, status: { in: ["success", "failed", "timeout"] } },
    select: { personaId: true, state: true },
  });

  const byLevel = new Map<string, { attempts: number; best: Partial<Record<MetricCode, number>> }>();
  for (const s of finished) {
    const entry = byLevel.get(s.personaId) ?? { attempts: 0, best: {} };
    entry.attempts += 1;
    const state = s.state as unknown as SessionState | null;
    if (state) {
      for (const m of METRICS) {
        const v = state[m];
        if (typeof v !== "number") continue;
        const prev = entry.best[m];
        entry.best[m] = prev === undefined ? v : better(m, prev, v);
      }
    }
    byLevel.set(s.personaId, entry);
  }

  return levels.map((l, i) => {
    const agg = byLevel.get(l.persona.id);
    return {
      levelId: l.persona.id,
      callNumber: i + 1,
      scenarioId: l.scenario.id,
      scenarioTitle: l.scenario.title,
      // No typeLabel here on purpose: the board must not carry the answer,
      // not even in the serialised props it ships to the client.
      personaType: l.persona.type,
      displayName: l.persona.displayName,
      attempts: agg?.attempts ?? 0,
      bestMetrics: agg && Object.keys(agg.best).length > 0 ? agg.best : null,
    };
  });
}
