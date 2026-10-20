"use client";

import { useState } from "react";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { ROLE_LABEL, type Role } from "@/lib/access";
import { PlayableRole, RoleChips } from "@/components/ui/RoleChips";
import { DIRECTION_PRESETS, DirectionId, canPlayDirection } from "@/lib/org/assignable";
import { MetricCode } from "@/lib/engine/types";

export interface MemberView {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
  finished: number;
  assigned: number;
  assignedDone: number;
  lastActivity: Date | null;
  average: Partial<Record<MetricCode, number>>;
}

export interface AssignableScenario {
  id: string;
  title: string;
  direction: DirectionId;
  npcName: string;
}

/**
 * Список сотрудников компании с прогрессом и назначением разговоров.
 *
 * Назначать можно только то, во что человек может играть: подчинённому не
 * предлагается разговор, где игрок руководитель. Список сценариев поэтому
 * фильтруется по роли выбранного человека, а не показывается целиком.
 */
export function PeopleTable({
  members,
  scenarios,
}: {
  members: MemberView[];
  scenarios: AssignableScenario[];
}) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Положение человека правит HR здесь же: от роли зависит, какие разговоры
  // ему вообще видны, и ошибку при заведении надо уметь исправить.
  async function changeRole(userId: string, role: PlayableRole) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не получилось сменить роль.");
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function assign(userId: string, scenarioId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, scenarioId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не получилось назначить.");
        return;
      }
      setOpenFor(null);
      // Серверные данные обновляются перезагрузкой: экран читает их на сервере.
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  if (members.length === 0) {
    return (
      <Text as="p" display="block" color="secondary">
        В компании пока нет сотрудников. Добавьте их сами или дайте им код
        компании для самостоятельной регистрации.
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-md border-[1.5px] border-metric-resistance px-3 py-2">
          <Text type="supporting" weight="bold" display="block">
            {error}
          </Text>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b-[1.5px] border-border-strong">
              {["Сотрудник", "Роль", "Пройдено", "Назначено", "Последняя активность", ""].map((h) => (
                <th key={h} className="px-3 py-2 text-left">
                  <Text type="label" color="secondary">
                    {h}
                  </Text>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const forThisPerson = scenarios.filter((s) => canPlayDirection(m.role, s.direction));
              return (
                <tr key={m.id} className="border-b border-border align-top">
                  <td className="px-3 py-3">
                    <Text display="block">{m.displayName ?? m.email}</Text>
                    {m.displayName && (
                      <Text type="supporting" color="secondary" display="block">
                        {m.email}
                      </Text>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {m.role === "hr" ? (
                      <Text type="supporting">{ROLE_LABEL[m.role]}</Text>
                    ) : (
                      <RoleChips
                        value={m.role}
                        isDisabled={busy}
                        onChange={(role) => void changeRole(m.id, role)}
                      />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[15px] tabular-nums text-primary">{m.finished}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[15px] tabular-nums text-primary">
                      {m.assignedDone} / {m.assigned}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <Text type="supporting" color="secondary">
                      {m.lastActivity
                        ? new Date(m.lastActivity).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
                        : "не начинал"}
                    </Text>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      label={openFor === m.id ? "Отмена" : "Назначить"}
                      onClick={() => setOpenFor(openFor === m.id ? null : m.id)}
                    />
                    {openFor === m.id && (
                      <div className="mt-2 flex max-h-72 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-surface p-2 text-left">
                        {forThisPerson.length === 0 ? (
                          <Text type="supporting" color="secondary" display="block">
                            Для роли «{ROLE_LABEL[m.role]}» подходящих разговоров нет.
                          </Text>
                        ) : (
                          forThisPerson.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              disabled={busy}
                              onClick={() => void assign(m.id, s.id)}
                              className="rounded-md px-2 py-1.5 text-left hover:bg-muted disabled:opacity-60"
                            >
                              <Text display="block">{s.title}</Text>
                              <Text type="supporting" color="secondary" display="block">
                                {s.npcName} · {DIRECTION_PRESETS[s.direction].label}
                              </Text>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
