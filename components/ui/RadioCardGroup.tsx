"use client";

/**
 * Large clickable option cards backed by a real radio group: the whole card is
 * the control, arrow keys move between options, and only the selected input is
 * in the tab order — native radio behaviour, which the spec asks for
 * explicitly.
 */
export function RadioCardGroup<V extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: { value: V; label: string }[];
  value: V | undefined;
  onChange: (v: V) => void;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="sr-only">{legend}</legend>
      <div className="flex flex-col gap-3">
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <label
              key={o.value}
              className={`flex cursor-pointer items-center gap-3.5 rounded-lg border-[1.5px] px-5 py-4 text-[17px] text-primary motion-safe:transition-colors ${
                selected ? "border-accent bg-body" : "border-border hover:border-border-strong"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={selected}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                  selected ? "border-accent" : "border-border-strong"
                }`}
              >
                {selected && <span className="h-2.5 w-2.5 rounded-full bg-accent-bg" />}
              </span>
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
