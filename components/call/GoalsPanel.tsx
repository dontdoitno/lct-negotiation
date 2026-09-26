export interface GoalStatus {
  id: string;
  text: string;
  progress: number;
  done: boolean;
}

export function GoalsPanel({ goals }: { goals: GoalStatus[] }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label-case text-[11px] text-ink-muted">Ваши цели</span>
      <ul className="flex flex-col gap-1.5">
        {goals.map((g) => (
          <li key={g.id} className="flex items-center gap-2 text-[13px] text-ink">
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px]"
              style={{
                borderColor: g.done ? "var(--color-trust)" : "var(--color-line-strong)",
                background: g.done ? "var(--color-trust)" : g.progress > 0 ? "var(--color-panel-raised)" : "transparent",
                color: g.done ? "var(--color-void)" : "transparent",
              }}
            >
              {g.done ? "✓" : ""}
            </span>
            <span className={g.done ? "text-ink" : "text-ink-muted"}>{g.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
