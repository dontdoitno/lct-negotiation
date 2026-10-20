import { DirectionId } from "@/lib/scenarios/directions";

/**
 * Роли и то, что им доступно.
 *
 * Роль определяет не только права в интерфейсе, но и какие разговоры человек
 * видит в каталоге. Направление разговора уже говорит, кем играет человек:
 * «вниз» это разговор руководителя с подчинённым, «вверх» наоборот. Поэтому
 * фильтр каталога выводится из направления, а не из отдельного поля.
 */
export type Role = "employee" | "manager" | "hr";

export const ROLE_LABEL: Record<Role, string> = {
  employee: "Сотрудник",
  manager: "Руководитель",
  hr: "HR",
};

/** Какие направления доступны роли. У HR свой контур, разговоры он тоже играет. */
const DIRECTIONS_BY_ROLE: Record<Role, DirectionId[]> = {
  // Снизу вверх и на равных: подчинённый спорит с начальником и с коллегой.
  employee: ["up", "peer"],
  // Сверху вниз, посредничество и разговор с топами: всё, где игрок ведёт.
  manager: ["down", "peer", "mediation", "top"],
  // HR проверяет любой сценарий перед назначением, поэтому видит всё.
  hr: ["down", "up", "peer", "mediation", "top"],
};

export function directionsFor(role: Role): DirectionId[] {
  return DIRECTIONS_BY_ROLE[role];
}

export function canPlay(role: Role, direction: DirectionId): boolean {
  return DIRECTIONS_BY_ROLE[role].includes(direction);
}

/**
 * Гость в компанию не входит, поэтому роли у него нет и фильтровать нечего:
 * он видит весь каталог. Это демонстрационный путь с лендинга, результат в
 * организацию не попадает.
 */
export function directionsForGuest(): DirectionId[] {
  return ["down", "up", "peer", "mediation", "top"];
}

export function isHr(role: Role | null | undefined): boolean {
  return role === "hr";
}

const ROLES = new Set<string>(["employee", "manager", "hr"]);

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.has(value);
}
