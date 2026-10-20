import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { isRole, type Role } from "@/lib/access";

/**
 * Появление человека в компании. Путей два, и оба нужны: HR заводит сотрудника
 * сам, а сотрудник может зарегистрироваться по коду компании.
 *
 * Роль HR через эти функции не выдаётся. Иначе любой, кто знает код компании,
 * получил бы доступ к её людям и аналитике.
 */

export type PlayableRole = Extract<Role, "employee" | "manager">;

export function isPlayableRole(value: unknown): value is PlayableRole {
  return value === "employee" || value === "manager";
}

type Result = { ok: true; email: string; password: string } | { ok: false; error: string };

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

async function create(params: {
  email: string;
  password: string;
  role: PlayableRole;
  displayName?: string | null;
  organizationId: string | null;
}): Promise<Result> {
  const email = normalize(params.email);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: "Такой адрес уже зарегистрирован." };

  await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(params.password),
      role: params.role,
      displayName: params.displayName?.trim() || null,
      organizationId: params.organizationId,
    },
  });
  return { ok: true, email, password: params.password };
}

/**
 * Самостоятельная регистрация. Код компании необязателен: без него аккаунт
 * живёт вне организаций, прогресс сохраняется, но в чужой админке не виден.
 */
export async function registerAccount(params: {
  email: string;
  password: string;
  role: PlayableRole;
  displayName?: string | null;
  joinCode?: string | null;
}): Promise<Result> {
  let organizationId: string | null = null;
  const code = params.joinCode?.trim();
  if (code) {
    const org = await prisma.organization.findUnique({
      where: { joinCode: code.toUpperCase() },
      select: { id: true },
    });
    if (!org) return { ok: false, error: "Компания с таким кодом не найдена." };
    organizationId = org.id;
  }
  return create({ ...params, organizationId });
}

/** HR заводит сотрудника руками и передаёт ему пароль. */
export async function createMember(params: {
  organizationId: string;
  email: string;
  password: string;
  role: PlayableRole;
  displayName?: string | null;
}): Promise<Result> {
  return create(params);
}

/**
 * Смена роли внутри компании. Положение человека решает, какие разговоры он
 * видит, поэтому править его может только HR своей организации.
 */
export async function setMemberRole(
  organizationId: string,
  userId: string,
  role: PlayableRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isRole(role) || !isPlayableRole(role)) return { ok: false, error: "Такой роли нет." };
  const updated = await prisma.user.updateMany({
    where: { id: userId, organizationId, role: { in: ["employee", "manager"] } },
    data: { role },
  });
  if (updated.count === 0) return { ok: false, error: "Такого сотрудника нет в вашей компании." };
  return { ok: true };
}
