"use client";

export interface ScoreEvent {
  id: string;
  points: number;
}

export function ScorePopupStack({ events }: { events: ScoreEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col items-end gap-1">
      {events.map((e) => (
        <span
          key={e.id}
          className="rise-in rounded-full px-2.5 py-1 font-mono text-xs font-semibold"
          style={{
            color: e.points >= 0 ? "var(--color-trust)" : "var(--color-resistance)",
            background: e.points >= 0 ? "var(--color-trust-soft)" : "var(--color-resistance-soft)",
          }}
        >
          {e.points >= 0 ? "+" : ""}
          {e.points}
        </span>
      ))}
    </div>
  );
}
