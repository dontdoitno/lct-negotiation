"use client";

import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";

/**
 * Поля конструктора. Той же дизайн-системой, что и пользовательский интерфейс,
 * но плотнее: отступы и типографика берутся на ступень ниже по той же шкале.
 */

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  /** Текст ошибки. Подпись краснеет, под полем появляется объяснение. */
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={error ? "block text-metric-resistance" : "block"}>
        <Text type="label" color={error ? "inherit" : "secondary"} display="block">
          {label}
        </Text>
      </span>
      {children}
      {error ? (
        <span className="block text-metric-resistance">
          <Text type="supporting" color="inherit" display="block">
            {error}
          </Text>
        </span>
      ) : (
        hint && (
          <Text type="supporting" color="secondary" display="block">
            {hint}
          </Text>
        )
      )}
    </div>
  );
}

/** Многострочный ввод: у дизайн-системы нет textarea, поэтому стилизуем свой. */
export function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
  hasError,
}: {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  hasError?: boolean;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      aria-invalid={hasError || undefined}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-md border-[1.5px] bg-surface px-3 py-2 text-[15px] text-primary outline-none focus:border-accent ${
        hasError ? "border-metric-resistance" : "border-border"
      }`}
    />
  );
}

/**
 * Редактируемый список строк. Пустая строка внизу не добавляется сама: админ
 * жмёт «Добавить», иначе список растёт от каждого клика мимо.
 */
export function StringListField({
  label,
  hint,
  error,
  items,
  onChange,
  addLabel = "Добавить",
  placeholder,
  min = 0,
  minHint,
}: {
  label: string;
  hint?: string;
  error?: string;
  items: string[];
  onChange: (next: string[]) => void;
  addLabel?: string;
  placeholder?: string;
  min?: number;
  /** Объяснение, почему «Удалить» выключено на минимальном числе пунктов. */
  minHint?: string;
}) {
  function update(i: number, value: string) {
    const next = [...items];
    next[i] = value;
    onChange(next);
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <Field label={label} hint={hint} error={error}>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1">
              <TextInput value={item} onChange={(next) => update(i, next)} placeholder={placeholder} isLabelHidden label={`${label} ${i + 1}`} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              label="Удалить"
              isDisabled={items.length <= min}
              onClick={() => remove(i)}
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" label={addLabel} onClick={() => onChange([...items, ""])} />
          {/* Выключенная кнопка без объяснения читается как сломанная. */}
          {minHint && items.length <= min && (
            <Text type="supporting" color="secondary">
              {minHint}
            </Text>
          )}
        </div>
      </div>
    </Field>
  );
}

/** Ряд взаимоисключающих переключателей. */
export function ChoiceRow<V extends string>({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (next: V) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-full border-[1.5px] px-3 py-1 text-[13px] motion-safe:transition-colors ${
              value === o.value
                ? "border-accent bg-accent text-on-accent"
                : "border-border text-secondary hover:border-border-strong"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--color-accent)]"
      />
      <Text type="supporting">{label}</Text>
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  hint,
  error,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  hint?: string;
  error?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-28 rounded-md border-[1.5px] bg-surface px-3 py-2 font-mono text-[15px] tabular-nums text-primary outline-none focus:border-accent ${
          error ? "border-metric-resistance" : "border-border"
        }`}
      />
    </Field>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step: number;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 flex-1 accent-[var(--color-accent)]"
        />
        <span className="w-12 text-right font-mono text-[13px] tabular-nums text-secondary">
          {value.toFixed(2)}
        </span>
      </div>
    </Field>
  );
}

/** Комбобокс: выбор из списка плюс возможность ввести своё. */
export function ComboBox({
  label,
  value,
  options,
  onChange,
  hint,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
  hint?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <div className="flex flex-col gap-2">
        <TextInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          isLabelHidden
          label={label}
          status={error ? { type: "error" } : undefined}
        />
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={`rounded-full border-[1.5px] px-2.5 py-0.5 text-[12px] motion-safe:transition-colors ${
                value === o
                  ? "border-accent bg-accent text-on-accent"
                  : "border-border text-secondary hover:border-border-strong"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    </Field>
  );
}
