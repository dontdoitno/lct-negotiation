export function TurnCounter({ turn, limit }: { turn: number; limit: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="label-case whitespace-nowrap text-[11px] text-ink-muted">
        Ход {Math.min(turn, limit)} из {limit}
      </span>
      <div className="flex flex-1 gap-[3px]">
        {Array.from({ length: limit }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-[1px] transition-colors duration-300"
            style={{ background: i < turn ? "var(--color-accent)" : "var(--color-panel-raised)" }}
          />
        ))}
      </div>
    </div>
  );
}
