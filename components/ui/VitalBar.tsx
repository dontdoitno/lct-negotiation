"use client";

const COLOR_MAP = {
  resistance: { fg: "var(--color-resistance)", soft: "var(--color-resistance-soft)" },
  trust: { fg: "var(--color-trust)", soft: "var(--color-trust-soft)" },
  adapt: { fg: "var(--color-adapt)", soft: "var(--color-adapt-soft)" },
  insight: { fg: "var(--color-insight)", soft: "var(--color-insight-soft)" },
} as const;

export function VitalBar({
  label,
  value,
  bucketLabel,
  delta,
  color,
}: {
  label: string;
  value: number;
  bucketLabel: string;
  delta?: number;
  color: keyof typeof COLOR_MAP;
}) {
  const c = COLOR_MAP[color];
  const showDelta = typeof delta === "number" && delta !== 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="label-case text-[11px] text-ink-muted">{label}</span>
        <div className="flex items-center gap-1.5">
          {showDelta && (
            <span
              className="font-mono text-[11px] tabular-nums"
              style={{ color: delta! > 0 ? "var(--color-resistance)" : "var(--color-trust)" }}
            >
              {delta! > 0 ? "↑" : "↓"} {Math.abs(delta!)}
            </span>
          )}
          <span className="font-mono text-xs text-ink">{bucketLabel}</span>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--color-panel-sunken)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(2, value)}%`, background: c.fg, boxShadow: `0 0 10px 0 ${c.soft}` }}
        />
      </div>
    </div>
  );
}
