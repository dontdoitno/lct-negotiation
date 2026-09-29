"use client";

import { useMemo } from "react";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { CaseBase } from "@/lib/flow/cases";
import { CASES } from "@/lib/flow/copy";
import { DIFFICULTY_PRESETS } from "@/lib/scenarios/presets";
import { DifficultyPreset, Tone } from "@/lib/scenarios/types";

export interface FilterState {
  query: string;
  domain: string | null;
  tone: Tone | null;
  difficulty: DifficultyPreset | null;
  onlyUnplayed: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  query: "",
  domain: null,
  tone: null,
  difficulty: null,
  onlyUnplayed: false,
};

const TONE_LABELS: Record<Tone, string> = {
  aggressive: "Агрессивный",
  anxious: "Тревожный",
  rational: "Рациональный",
  custom: "Свой характер",
};

/**
 * Ряд фильтров над каталогом. Значения не выдумываются: список сфер и тонов
 * собирается из того, что реально опубликовано, поэтому пустых вариантов,
 * которые ничего не находят, здесь не бывает.
 */
export function CatalogFilters({
  cases,
  value,
  onChange,
}: {
  cases: CaseBase[];
  value: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const domains = useMemo(() => [...new Set(cases.map((c) => c.domain))].sort(), [cases]);
  const tones = useMemo(() => [...new Set(cases.map((c) => c.tone))], [cases]);
  const difficulties = useMemo(
    () => (["easy", "normal", "hard"] as DifficultyPreset[]).filter((d) => cases.some((c) => c.difficulty === d)),
    [cases],
  );

  const dirty =
    value.query !== "" || value.domain !== null || value.tone !== null || value.difficulty !== null || value.onlyUnplayed;

  function set<K extends keyof FilterState>(key: K, next: FilterState[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border-[1.5px] border-border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <TextInput
            label={CASES.searchLabel}
            value={value.query}
            onChange={(next) => set("query", next)}
            placeholder={CASES.searchPlaceholder}
          />
        </div>
        {dirty && <Button variant="ghost" size="sm" label={CASES.resetFilters} onClick={() => onChange(EMPTY_FILTERS)} />}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <FilterRow
          label={CASES.filterDomain}
          options={domains.map((d) => ({ value: d, label: d }))}
          selected={value.domain}
          onSelect={(v) => set("domain", v)}
        />
        <FilterRow
          label={CASES.filterTone}
          options={tones.map((t) => ({ value: t, label: TONE_LABELS[t] }))}
          selected={value.tone}
          onSelect={(v) => set("tone", v as Tone | null)}
        />
        <FilterRow
          label={CASES.filterDifficulty}
          options={difficulties.map((d) => ({ value: d, label: DIFFICULTY_PRESETS[d].label }))}
          selected={value.difficulty}
          onSelect={(v) => set("difficulty", v as DifficultyPreset | null)}
        />
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value.onlyUnplayed}
            onChange={(e) => set("onlyUnplayed", e.target.checked)}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          <Text type="supporting">{CASES.filterUnplayed}</Text>
        </label>
      </div>
    </div>
  );
}

/** Ряд переключателей: повторный клик по выбранному снимает фильтр. */
function FilterRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  if (options.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Text type="label" color="secondary">
        {label}
      </Text>
      {options.map((o) => {
        const active = selected === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(active ? null : o.value)}
            className={`rounded-full border-[1.5px] px-3 py-1 text-[13px] motion-safe:transition-colors ${
              active
                ? "border-accent bg-accent text-on-accent"
                : "border-border text-secondary hover:border-border-strong"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
