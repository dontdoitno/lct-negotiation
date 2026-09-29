"use client";

import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { CaseBase } from "@/lib/flow/cases";
import { CASES } from "@/lib/flow/copy";
import { DIFFICULTY_PRESETS } from "@/lib/scenarios/presets";
import { DifficultyPreset } from "@/lib/scenarios/types";
import { FilterState, EMPTY_FILTERS } from "./filters";

/**
 * Левая колонка каталога. Сферы здесь главный способ навигации, поэтому они
 * лежат списком и всегда раскрыты, а остальные фильтры убраны вниз и не
 * перетягивают внимание.
 *
 * Колонку можно свернуть влево: на узком экране и при одной сфере она только
 * занимает место.
 */
export function DomainRail({
  cases,
  value,
  onChange,
  collapsed,
  onToggle,
}: {
  cases: CaseBase[];
  value: FilterState;
  onChange: (next: FilterState) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const domains = [...new Set(cases.map((c) => c.domain))].sort();
  const difficulties = (["easy", "normal", "hard"] as DifficultyPreset[]).filter((d) =>
    cases.some((c) => c.difficulty === d),
  );

  const dirty = value.query !== "" || value.difficulty !== null || value.onlyUnplayed;

  function set<K extends keyof FilterState>(key: K, next: FilterState[K]) {
    onChange({ ...value, [key]: next });
  }

  if (collapsed) {
    return (
      <aside className="sticky top-0 flex h-screen w-14 shrink-0 flex-col items-center border-r border-border bg-body py-6">
        <button
          type="button"
          onClick={onToggle}
          aria-label={CASES.railExpand}
          title={CASES.railExpand}
          className="rounded-md p-2 text-secondary motion-safe:transition-colors hover:bg-surface hover:text-primary"
        >
          <ChevronRight />
        </button>
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-body px-5 py-6">
      <div className="flex items-center justify-between">
        <Text type="label" color="secondary">
          {CASES.railTitle}
        </Text>
        <button
          type="button"
          onClick={onToggle}
          aria-label={CASES.railCollapse}
          title={CASES.railCollapse}
          className="rounded-md p-1 text-disabled motion-safe:transition-colors hover:bg-surface hover:text-primary"
        >
          <ChevronLeft />
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        <RailItem
          label={CASES.allDomains}
          count={cases.length}
          active={value.domain === null}
          onClick={() => set("domain", null)}
        />
        {domains.map((domain) => (
          <RailItem
            key={domain}
            label={domain}
            count={cases.filter((c) => c.domain === domain).length}
            active={value.domain === domain}
            onClick={() => set("domain", value.domain === domain ? null : domain)}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-4 border-t border-border pt-5">
        <TextInput
          label={CASES.searchLabel}
          value={value.query}
          onChange={(next) => set("query", next)}
          placeholder={CASES.searchPlaceholder}
          size="sm"
        />

        <FilterGroup
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

        {dirty && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              label={CASES.resetFilters}
              onClick={() => onChange({ ...EMPTY_FILTERS, domain: value.domain })}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

/** Строка сферы: название слева, число разговоров справа. */
function RailItem({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active || undefined}
      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left motion-safe:transition-colors ${
        active ? "bg-inverted" : "hover:bg-surface"
      }`}
    >
      <span className={`truncate text-[15px] ${active ? "font-bold text-surface" : "text-primary"}`}>{label}</span>
      <span className={`shrink-0 font-mono text-[13px] tabular-nums ${active ? "text-surface" : "text-disabled"}`}>
        {count}
      </span>
    </button>
  );
}

function FilterGroup({
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
    <div className="flex flex-col gap-1.5">
      <Text type="label" color="secondary" display="block">
        {label}
      </Text>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onSelect(active ? null : o.value)}
              className={`rounded-full border px-2.5 py-0.5 text-[12px] motion-safe:transition-colors ${
                active
                  ? "border-transparent bg-inverted text-surface"
                  : "border-border text-secondary hover:border-border-strong"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
