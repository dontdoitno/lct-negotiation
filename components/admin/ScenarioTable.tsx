"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ADMIN } from "@/lib/flow/copy";
import { DIFFICULTY_PRESETS } from "@/lib/scenarios/presets";
import { ScenarioDefinition, Tone } from "@/lib/scenarios/types";

const TONE_LABELS: Record<Tone, string> = {
  aggressive: "Агрессивный",
  anxious: "Тревожный",
  rational: "Рациональный",
  manipulative: "Манипулятивный",
  passive_aggressive: "Пассивно-агрессивный",
  burnt_out: "Выгоревший",
  conformist: "Конформист",
  custom: "Свой",
};

type SortKey = "updatedAt" | "playthroughCount";

/**
 * Список сценариев. Плотность выше пользовательской: строки компактнее,
 * типографика мельче, но значения берутся из той же шкалы токенов.
 *
 * Всё меняется без перезагрузки: действия ходят в API и обновляют серверные
 * данные через router.refresh().
 */
export function ScenarioTable({ scenarios }: { scenarios: ScenarioDefinition[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const [domain, setDomain] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("updatedAt");

  const domains = useMemo(() => [...new Set(scenarios.map((s) => s.domain))].sort(), [scenarios]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scenarios
      .filter((s) => {
        if (status !== "all" && s.status !== status) return false;
        if (domain && s.domain !== domain) return false;
        if (q && !s.title.toLowerCase().includes(q) && !s.topic.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) =>
        sort === "playthroughCount"
          ? b.playthroughCount - a.playthroughCount
          : b.updatedAt.localeCompare(a.updatedAt),
      );
  }, [scenarios, query, status, domain, sort]);

  async function call(id: string, path: string, init: RequestInit) {
    setBusyId(id);
    try {
      const res = await fetch(path, init);
      if (!res.ok) {
        window.alert("Не получилось выполнить действие. Попробуйте ещё раз.");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  function togglePublish(s: ScenarioDefinition) {
    return call(s.id, `/api/admin/scenarios/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s.status === "published" ? "draft" : "published" }),
    });
  }

  function duplicate(s: ScenarioDefinition) {
    return call(s.id, `/api/admin/scenarios/${s.id}/duplicate`, { method: "POST" });
  }

  function remove(s: ScenarioDefinition) {
    if (!window.confirm(ADMIN.confirmDelete(s.title))) return;
    return call(s.id, `/api/admin/scenarios/${s.id}`, { method: "DELETE" });
  }

  if (scenarios.length === 0) {
    return (
      <div className="rounded-lg border-[1.5px] border-border bg-surface p-8">
        <Heading level={2}>{ADMIN.emptyTitle}</Heading>
        <div className="mt-2">
          <Text as="p" display="block" color="secondary">
            {ADMIN.emptyHint}
          </Text>
        </div>
        <div className="mt-5 flex gap-2">
          <Link href="/admin/scenarios/new">
            <Button variant="primary" label={ADMIN.create} />
          </Link>
          <Link href="/admin/scenarios/generate">
            <Button variant="secondary" label={ADMIN.generate} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={pending ? "opacity-70 motion-safe:transition-opacity" : ""}>
      <div className="flex flex-wrap items-end gap-3 rounded-lg border-[1.5px] border-border bg-surface p-3">
        <div className="min-w-56 flex-1">
          <TextInput label={ADMIN.searchPlaceholder} value={query} onChange={setQuery} />
        </div>
        <Chips
          label={ADMIN.filterStatus}
          options={[
            { value: "all", label: "Все" },
            { value: "draft", label: ADMIN.statusDraft },
            { value: "published", label: ADMIN.statusPublished },
          ]}
          selected={status}
          onSelect={(v) => setStatus(v as typeof status)}
        />
        {domains.length > 1 && (
          <Chips
            label={ADMIN.filterDomain}
            options={[{ value: "", label: "Все" }, ...domains.map((d) => ({ value: d, label: d }))]}
            selected={domain ?? ""}
            onSelect={(v) => setDomain(v || null)}
          />
        )}
        <Chips
          label="Сортировка"
          options={[
            { value: "updatedAt", label: ADMIN.sortUpdated },
            { value: "playthroughCount", label: ADMIN.sortPlaythroughs },
          ]}
          selected={sort}
          onSelect={(v) => setSort(v as SortKey)}
        />
      </div>

      {visible.length === 0 ? (
        <div className="mt-6">
          <Text color="secondary">{ADMIN.nothingFound}</Text>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border-[1.5px] border-border bg-surface">
          {/* Девять колонок на телефоне превращались в таблицу шириной 1204
              пикселя: на экране оставались название и сфера, а статус и все
              кнопки действий уезжали вправо. Подробности там прячем, а строка
              перестаёт быть строкой таблицы и становится блоком: название со
              статусом сверху, кнопки действий под ними во всю ширину. */}
          <table className="w-full border-collapse lg:min-w-[960px]">
            <thead className="hidden lg:table-header-group">
              <tr className="border-b-[1.5px] border-border">
                <Th>{ADMIN.columns.title}</Th>
                <Th hideNarrow>{ADMIN.columns.domain}</Th>
                <Th hideNarrow>{ADMIN.columns.topic}</Th>
                <Th hideNarrow>{ADMIN.columns.tone}</Th>
                <Th hideNarrow>{ADMIN.columns.difficulty}</Th>
                <Th hideNarrow>{ADMIN.columns.status}</Th>
                <Th align="right" hideNarrow>{ADMIN.columns.playthroughs}</Th>
                <Th hideNarrow>{ADMIN.columns.updatedAt}</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id} className="block border-b border-border last:border-b-0 hover:bg-body lg:table-row">
                  <Td>
                    <Link href={`/admin/scenarios/${s.id}/edit`}>
                      <Text weight="bold">{s.title}</Text>
                    </Link>
                    {/* На узком экране своей колонки у статуса нет: вдвоём с
                        названием и кнопками они не помещаются в ширину. */}
                    <div className="mt-1 lg:hidden">
                      <Badge label={s.status === "published" ? ADMIN.statusPublished : ADMIN.statusDraft} />
                    </div>
                  </Td>
                  <Td hideNarrow>{s.domain}</Td>
                  <Td hideNarrow>{s.topic}</Td>
                  <Td hideNarrow>{TONE_LABELS[s.tone]}</Td>
                  <Td hideNarrow>{DIFFICULTY_PRESETS[s.difficultyPreset].label}</Td>
                  <Td hideNarrow>
                    <Badge label={s.status === "published" ? ADMIN.statusPublished : ADMIN.statusDraft} />
                  </Td>
                  <Td align="right" hideNarrow>
                    <span className="font-mono tabular-nums">{s.playthroughCount}</span>
                  </Td>
                  <Td hideNarrow>{new Date(s.updatedAt).toLocaleDateString("ru-RU")}</Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-1 lg:justify-end">
                      <Link href={`/admin/scenarios/${s.id}/edit`}>
                        <Button variant="ghost" size="sm" label={ADMIN.actions.edit} />
                      </Link>
                      <Link href={`/admin/scenarios/${s.id}/test`}>
                        <Button variant="ghost" size="sm" label={ADMIN.actions.test} />
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        label={ADMIN.actions.duplicate}
                        isDisabled={busyId === s.id}
                        onClick={() => duplicate(s)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        label={s.status === "published" ? ADMIN.actions.unpublish : ADMIN.actions.publish}
                        isDisabled={busyId === s.id}
                        onClick={() => togglePublish(s)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        label={ADMIN.actions.remove}
                        isDisabled={busyId === s.id}
                        onClick={() => remove(s)}
                      />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
  hideNarrow,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  /** Колонка с подробностями: на узком экране её не показываем. */
  hideNarrow?: boolean;
}) {
  return (
    <th
      className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"} ${
        hideNarrow ? "hidden lg:table-cell" : ""
      }`}
    >
      <Text type="label" color="secondary">
        {children}
      </Text>
    </th>
  );
}

function Td({
  children,
  align = "left",
  hideNarrow,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  hideNarrow?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2 align-middle ${align === "right" ? "text-right" : "text-left"} ${
        hideNarrow ? "hidden lg:table-cell" : "block lg:table-cell"
      }`}
    >
      {typeof children === "string" ? <Text type="supporting">{children}</Text> : children}
    </td>
  );
}

function Chips({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Text type="label" color="secondary">
        {label}
      </Text>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSelect(o.value)}
          className={`rounded-full border-[1.5px] px-2.5 py-0.5 text-[12px] motion-safe:transition-colors ${
            selected === o.value
              ? "border-accent bg-accent text-on-accent"
              : "border-border text-secondary hover:border-border-strong"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
