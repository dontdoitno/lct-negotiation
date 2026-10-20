import { prisma } from "@/lib/db";
import { DirectionId } from "@/lib/scenarios/directions";
import { directionsFor, directionsForGuest, type Role } from "@/lib/access";
import { listRuntimeLevels } from "@/lib/scenarios/runtime";
import { MetricCode, SessionState } from "@/lib/engine/types";
import { DifficultyPreset, Tone } from "@/lib/scenarios/types";
import { PersonaType } from "./matching";

export interface CaseBase {
  levelId: string;
  /** Стабильный номер, который показывается вместо типа личности. */
  callNumber: number;
  title: string;
  domain: string;
  topic: string;
  direction: DirectionId;
  /** Разговор назначен этому человеку: карточка помечается и идёт первой. */
  assigned: boolean;
  /** Срок, если HR его поставил. */
  dueAt: Date | null;
  tone: Tone;
  difficulty: DifficultyPreset;
  /** Тип для подсказок подбора. Игроку не показывается. */
  personaType: PersonaType;
  displayName: string;
  attempts: number;
  /** Лучший результат по метрике среди завершённых попыток; null, пока их нет. */
  bestMetrics: Partial<Record<MetricCode, number>> | null;
}

const METRICS: MetricCode[] = ["A", "T", "R", "I", "S", "C"];

/** Меньшее сопротивление — лучший результат, поэтому для R «лучшее» переворачивается. */
function better(metric: MetricCode, a: number, b: number) {
  return metric === "R" ? Math.min(a, b) : Math.max(a, b);
}

/**
 * Каталог для конкретного человека.
 *
 * Роль решает, какие направления он видит: подчинённому незачем тренировать
 * разговор с подчинённым, у него такого разговора не бывает. Назначенные HR
 * разговоры не запирают каталог, а поднимаются наверх и помечаются.
 *
 * Гость роли не имеет и видит всё: это демонстрационный путь с лендинга.
 */
export async function loadCases(
  userId: string,
  options: { role?: Role | null; organizationId?: string | null } = {},
): Promise<CaseBase[]> {
  const all = await listRuntimeLevels();

  const allowed = options.role ? directionsFor(options.role) : directionsForGuest();
  const levels = all.filter((l) => {
    if (!allowed.includes(l.definition.direction)) return false;
    // Сценарий чужой компании в каталог не попадает. Пустая организация
    // означает общий каталог и доступна всем.
    const owner = l.definition.organizationId ?? null;
    return owner === null || owner === (options.organizationId ?? null);
  });

  const assignments = await prisma.assignment.findMany({
    where: { userId },
    select: { scenarioId: true, dueAt: true },
  });
  const assignedBy = new Map(assignments.map((a) => [a.scenarioId, a.dueAt]));

  const finished = await prisma.session.findMany({
    // Тест-прогоны администратора в пользовательскую статистику не идут.
    where: { userId, isTestRun: false, status: { in: ["success", "failed", "timeout", "stopped"] } },
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

  const cases = levels.map((l, i) => {
    const agg = byLevel.get(l.levelId);
    return {
      assigned: assignedBy.has(l.levelId),
      dueAt: assignedBy.get(l.levelId) ?? null,
      levelId: l.levelId,
      callNumber: i + 1,
      title: l.definition.title,
      domain: l.definition.domain,
      topic: l.definition.topic,
      direction: l.definition.direction,
      tone: l.definition.tone,
      difficulty: l.definition.difficultyPreset,
      // Тип личности едет на клиент только ради подсказок подбора: на карточке
      // его не показывают, определить характер — задача участника.
      personaType: l.persona.type,
      displayName: l.definition.npcName,
      attempts: agg?.attempts ?? 0,
      bestMetrics: agg && Object.keys(agg.best).length > 0 ? agg.best : null,
    };
  });

  // Назначенное идёт первым, внутри групп порядок сохраняется.
  return cases.sort((a, b) => Number(b.assigned) - Number(a.assigned));
}
