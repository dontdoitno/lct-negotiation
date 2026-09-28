"use client";

import { useEffect, useState } from "react";
import { METRIC_META } from "@/lib/engine/labels";
import { SessionState } from "@/lib/engine/types";
import { Deltas } from "@/lib/call/reducer";
import { formatDelta, isFavorable, isLowerBetter, METRIC_ORDER } from "@/lib/call/metricDirection";

const FLASH_MS = 3000;

/**
 * All 6 metrics, always visible. Rows that moved on the latest turn are highlighted for 3s:
 * solid accent = moved toward the goal, dashed/striped = moved against it.
 */
export function LiveMetrics({ state, deltas, deltaSeq, turn }: { state: SessionState; deltas: Deltas; deltaSeq: number; turn: number }) {
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (deltaSeq === 0) return;
    setFlashing(true);
    const t = setTimeout(() => setFlashing(false), FLASH_MS);
    return () => clearTimeout(t);
  }, [deltaSeq]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="label-case text-[11px] text-secondary">Метрики разговора</span>
        {turn > 0 && <span className="text-[12px] text-disabled">после реплики {turn}</span>}
      </div>

      {METRIC_ORDER.map((m) => {
        const value = Math.round(state[m]);
        const d = deltas[m] ?? 0;
        const moved = d !== 0;
        const good = moved && isFavorable(m, d);
        const lit = flashing && moved;
        const lineStyle = good ? "border-solid" : "border-dashed";

        return (
          <div
            key={m}
            className={`flex flex-col gap-1.5 rounded-md border-2 px-2 py-2 transition-colors duration-300 ${lit ? `${lineStyle} border-accent` : "border-transparent border-b-border"}`}
          >
            <div className="flex items-center justify-between gap-2">
              {/* min-w-0 lets a long label wrap or shrink instead of squeezing
                  the readout; the readout itself never wraps. */}
              <span className="min-w-0 text-base text-primary">
                {METRIC_META[m].label}
                {isLowerBetter(m) && <span className="ml-1 whitespace-nowrap text-[11px] text-disabled">↓ лучше</span>}
              </span>
              <span className="flex shrink-0 items-center gap-2.5">
                <span className="font-mono text-[17px] tabular-nums text-primary">{value}</span>
                <span
                  className={`whitespace-nowrap rounded border-[1.5px] px-1.5 font-mono text-[12px] tabular-nums ${moved ? `${lineStyle} border-accent text-accent` : "border-border text-disabled"}`}
                >
                  {moved ? formatDelta(d) : "– 0"}
                </span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded border border-disabled bg-track">
              <div
                className="h-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${Math.max(2, Math.min(100, value))}%`,
                  background: lit
                    ? good
                      ? "var(--color-accent)"
                      : "repeating-linear-gradient(45deg, var(--color-accent) 0 4px, #fff 4px 8px)"
                    : "#8a8a8a",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
