export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded border-[1.5px] border-border bg-track"
    >
      <div className="h-full bg-accent-bg motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StepDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={`Шаг ${active + 1} из ${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`h-2 rounded-full motion-safe:transition-all ${
            i === active ? "w-6 bg-accent-bg" : "w-2 bg-border-strong"
          }`}
        />
      ))}
    </div>
  );
}
