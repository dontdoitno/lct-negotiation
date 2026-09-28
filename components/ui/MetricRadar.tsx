import { MetricCode } from "@/lib/engine/types";
import { METRIC_ORDER } from "@/lib/call/metricDirection";

const AXIS_LABEL: Record<MetricCode, string> = { A: "A", T: "T", R: "R", I: "I", S: "S", C: "C" };

function polygon(values: Partial<Record<MetricCode, number>>, cx: number, cy: number, r: number) {
  return METRIC_ORDER.map((m, i) => {
    // Start at 12 o'clock and go clockwise so the axis order reads naturally.
    const angle = (Math.PI * 2 * i) / METRIC_ORDER.length - Math.PI / 2;
    const v = Math.max(0, Math.min(100, values[m] ?? 0)) / 100;
    return `${(cx + Math.cos(angle) * r * v).toFixed(1)},${(cy + Math.sin(angle) * r * v).toFixed(1)}`;
  }).join(" ");
}

/**
 * Six-metric radar. Renders one or two contours (start vs end) — the debrief
 * shows both, the cases board shows a single accumulated one.
 *
 * Contours are distinguished by stroke style as well as colour (solid vs
 * dashed) so the comparison survives without colour perception.
 */
export function MetricRadar({
  end,
  start,
  size = 200,
  labelledBy,
}: {
  end: Partial<Record<MetricCode, number>>;
  start?: Partial<Record<MetricCode, number>>;
  size?: number;
  labelledBy?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 22;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-labelledby={labelledBy}>
      {[0.25, 0.5, 0.75, 1].map((step) => (
        <polygon
          key={step}
          points={polygon(
            Object.fromEntries(METRIC_ORDER.map((m) => [m, step * 100])) as Record<MetricCode, number>,
            cx,
            cy,
            r,
          )}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="1"
        />
      ))}

      {METRIC_ORDER.map((m, i) => {
        const angle = (Math.PI * 2 * i) / METRIC_ORDER.length - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (r + 13);
        const ly = cy + Math.sin(angle) * (r + 13);
        return (
          <text
            key={m}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fontFamily="var(--font-family-code)"
            fill="var(--color-text-secondary)"
          >
            {AXIS_LABEL[m]}
          </text>
        );
      })}

      {start && (
        <polygon
          points={polygon(start, cx, cy, r)}
          fill="none"
          stroke="var(--color-text-disabled)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      )}

      <polygon
        points={polygon(end, cx, cy, r)}
        fill="var(--color-accent-muted)"
        stroke="var(--color-accent)"
        strokeWidth="2"
      />
    </svg>
  );
}
