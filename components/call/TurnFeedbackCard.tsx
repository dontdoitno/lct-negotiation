import { METRIC_META } from "@/lib/engine/labels";
import { formatDelta, nonZeroDeltas } from "@/lib/call/metricDirection";
import { TranscriptItem } from "@/lib/call/reducer";

/** AI judge's 1–2 sentence feedback on the player's latest line, shown above the metrics it explains. */
export function TurnFeedbackCard({ item, pending }: { item: TranscriptItem | undefined; pending: boolean }) {
  if (!item) {
    return (
      <div className="rounded-lg border-[1.5px] border-dashed border-border p-3 text-[13px] leading-snug text-disabled">
        После вашей первой реплики здесь появится оценка: что сработало и почему сдвинулись метрики.
      </div>
    );
  }

  const quote = item.text.length > 60 ? `${item.text.slice(0, 60)}…` : item.text;

  if (pending || !item.rationale) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border-2 border-dashed border-disabled p-3">
        <div className="label-case text-[11px] text-secondary">Оценка вашей реплики</div>
        <div className="text-sm leading-snug text-secondary">«{quote}»</div>
        <div className="h-2 w-[90%] rounded bg-skeleton" />
        <div className="h-2 w-[60%] rounded bg-skeleton" />
        <div className="text-[12px] text-disabled">ИИ оценивает реплику…</div>
      </div>
    );
  }

  const border = item.positive ? "border-solid" : "border-dashed";
  const chips = nonZeroDeltas(item.deltas);

  return (
    <div key={item.id} className={`rise-in flex flex-col gap-1.5 rounded-lg border-2 ${border} border-accent p-3`}>
      <div className="label-case text-[11px] text-accent">Оценка вашей реплики</div>
      <div className="text-sm leading-snug text-secondary">«{quote}»</div>
      <div className="text-base leading-snug text-primary">{item.rationale}</div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map(([m, d]) => (
            <span key={m} className={`rounded border-[1.5px] ${border} border-accent px-1.5 text-[13px] text-accent`}>
              {METRIC_META[m].label} {formatDelta(d)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
