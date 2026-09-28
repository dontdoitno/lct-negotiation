"use client";

import { useCallback, useEffect, useState } from "react";
import { BRIEF_METRICS } from "@/lib/content/briefMetrics";
import { StartCallButton } from "@/components/StartCallButton";

/**
 * The strip pinned to the bottom of the briefing: what gets measured, the
 * session meta, and the start button — all on ONE row.
 *
 * It used to stack into two rows, which cost ~150px of a 13" laptop's
 * viewport and pushed the "Рамки" section off screen. Everything the player
 * needs before the call has to be visible at once, so the bar gets one row
 * and the briefing gets the height back.
 */
export function BriefBottomBar({ levelId }: { levelId: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/35" onClick={close} aria-hidden="true" />}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-border-strong bg-surface">
        {/* Expanded explanations sit ABOVE the bar row. Capped and scrollable so
            a short viewport can never bury the start button. */}
        {open && (
          <section
            id="brief-metrics-detail"
            aria-labelledby="brief-metrics-heading"
            className="max-h-[60vh] overflow-y-auto border-b-[1.5px] border-border"
          >
            <ul className="mx-auto grid max-w-wide gap-2.5 px-8 py-4 sm:grid-cols-2 lg:grid-cols-3">
              {BRIEF_METRICS.map((m) => (
                <li key={m.code} className="rounded-lg border-[1.5px] border-border p-3.5">
                  <h3 className="text-[15px] font-bold text-primary">{m.label}</h3>
                  <p className="mt-1 text-[14px] leading-snug text-secondary">{m.description}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mx-auto flex max-w-wide flex-wrap items-center gap-x-5 gap-y-2 px-8 py-3">
          <h2 id="brief-metrics-heading" className="label-case shrink-0 text-[10px] text-secondary">
            Что оценивается
          </h2>

          <ul className="flex flex-wrap items-center gap-1.5">
            {BRIEF_METRICS.map((m) => (
              <li
                key={m.code}
                className="rounded-full border border-border px-3 py-1 text-[13px] text-primary"
              >
                {m.label}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="brief-metrics-detail"
            className="shrink-0 text-[13px] text-primary underline underline-offset-4 hover:text-accent"
          >
            {open ? "Свернуть ▴" : "Пояснения ▾"}
          </button>

          {/* Meta and button travel together as one right-aligned group — two
              separate `ml-auto` items used to fight each other and wrap the
              button onto its own line. */}
          <div className="ml-auto flex shrink-0 items-center gap-5">
            <p className="hidden text-[13px] text-secondary xl:block">
              ≈ 10 минут · голос или текст · завершить можно в любой момент
            </p>
            <StartCallButton levelId={levelId} />
          </div>
        </div>
      </div>
    </>
  );
}
