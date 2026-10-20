import { prisma } from "@/lib/db";
import { MetricCode, SessionState } from "@/lib/engine/types";
import { isRole, type Role } from "@/lib/access";

/**
 * Люди компании и их прогресс — то, что видит HR.
 *
 * Всё здесь ограничено одной организацией. Чужих сотрудников HR не увидит ни
 * при каком запросе: организация подставляется из его собственного аккаунта,
 * а не приходит параметром из браузера.
 */

const METRICS: MetricCode[] = ["A", "T", "R", "I", "S", "C"];
const FINISHED = ["success", "failed", "timeout", "stopped"];

export interface MemberRow {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
  /** Сколько разговоров завершено. Тест-прогоны не считаются. */
  finished: number;
  assigned: number;
  assignedDone: number;
  lastActivity: Date | null;
  /** Средние метрики по завершённым разговорам. Пусто, если их нет. */
  average: Partial<Record<MetricCode, number>>;
}

export async function listMembers(organizationId: string): Promise<MemberRow[]> {
  const users = await prisma.user.findMany({
    where: { organizationId },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: { id: true, email: true, displayName: true, role: true },
  });
  if (users.length === 0) return [];

  const ids = users.map((u) => u.id);

  const sessions = await prisma.session.findMany({
    where: { userId: { in: ids }, isTestRun: false, status: { in: FINISHED } },
    select: { userId: true, personaId: true, state: true, finishedAt: true },
  });
  const assignments = await prisma.assignment.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, scenarioId: true },
  });

  return users.map((u) => {
    const own = sessions.filter((s) => s.userId === u.id);
    const mine = assignments.filter((a) => a.userId === u.id);
    const played = new Set(own.map((s) => s.personaId));

    const sums: Partial<Record<MetricCode, number>> = {};
    for (const s of own) {
      const state = s.state as unknown as SessionState | null;
      if (!state) continue;
      for (const m of METRICS) {
        const v = state[m];
        if (typeof v === "number") sums[m] = (sums[m] ?? 0) + v;
      }
    }
    const average: Partial<Record<MetricCode, number>> = {};
    if (own.length > 0) {
      for (const m of METRICS) if (sums[m] !== undefined) average[m] = Math.round(sums[m]! / own.length);
    }

    const times = own.map((s) => s.finishedAt).filter((d): d is Date => !!d);

    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: isRole(u.role) ? u.role : "employee",
      finished: own.length,
      assigned: mine.length,
      assignedDone: mine.filter((a) => played.has(a.scenarioId)).length,
      lastActivity: times.length ? new Date(Math.max(...times.map((d) => d.getTime()))) : null,
      average,
    };
  });
}

/** Назначение разговора. Повторное назначение обновляет срок, а не дублирует. */
export async function assignScenario(params: {
  organizationId: string;
  assignedById: string;
  userId: string;
  scenarioId: string;
  dueAt?: Date | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const member = await prisma.user.findFirst({
    where: { id: params.userId, organizationId: params.organizationId },
    select: { id: true },
  });
  if (!member) return { ok: false, error: "Такого сотрудника нет в вашей компании." };

  const scenario = await prisma.scenarioDefinition.findUnique({
    where: { id: params.scenarioId },
    select: { id: true, organizationId: true },
  });
  if (!scenario) return { ok: false, error: "Сценарий не найден." };
  if (scenario.organizationId && scenario.organizationId !== params.organizationId) {
    return { ok: false, error: "Этот сценарий принадлежит другой компании." };
  }

  await prisma.assignment.upsert({
    where: { userId_scenarioId: { userId: params.userId, scenarioId: params.scenarioId } },
    update: { dueAt: params.dueAt ?? null, assignedById: params.assignedById },
    create: {
      userId: params.userId,
      scenarioId: params.scenarioId,
      assignedById: params.assignedById,
      dueAt: params.dueAt ?? null,
    },
  });
  return { ok: true };
}

export async function unassignScenario(organizationId: string, userId: string, scenarioId: string) {
  const member = await prisma.user.findFirst({ where: { id: userId, organizationId }, select: { id: true } });
  if (!member) return;
  await prisma.assignment.deleteMany({ where: { userId, scenarioId } });
}

export async function assignmentsOf(organizationId: string, userId: string) {
  const member = await prisma.user.findFirst({ where: { id: userId, organizationId }, select: { id: true } });
  if (!member) return [];
  return prisma.assignment.findMany({ where: { userId }, select: { scenarioId: true, dueAt: true } });
}
