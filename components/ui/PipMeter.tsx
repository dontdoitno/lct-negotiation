const COLOR_MAP = {
  trust: "var(--color-trust)",
  insight: "var(--color-insight)",
} as const;

export function PipMeter({
  label,
  filled,
  total,
  valueLabel,
  color,
}: {
  label: string;
  filled: number;
  total: number;
  valueLabel: string;
  color: keyof typeof COLOR_MAP;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="label-case text-[11px] text-ink-muted">{label}</span>
        <span className="font-mono text-xs text-ink">{valueLabel}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors duration-500"
            style={{ background: i < filled ? COLOR_MAP[color] : "var(--color-panel-sunken)" }}
          />
        ))}
      </div>
    </div>
  );
}
