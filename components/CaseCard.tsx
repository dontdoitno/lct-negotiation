import Link from "next/link";
import { LevelCard } from "@/lib/progress";

const ACCENT_BY_TYPE: Record<LevelCard["type"], string> = {
  aggressive: "var(--color-resistance)",
  anxious: "var(--color-adapt)",
  rational: "var(--color-insight)",
};

export function CaseCard({ level, index }: { level: LevelCard; index: number }) {
  const accent = ACCENT_BY_TYPE[level.type];
  const caseNo = String(index + 1).padStart(2, "0");

  const inner = (
    <div
      className={`group relative flex h-full flex-col gap-4 overflow-hidden rounded-lg border p-4 transition-colors ${
        level.unlocked ? "border-line hover:border-line-strong" : "border-line/60"
      }`}
      style={{ background: "var(--color-panel)" }}
    >
      <div className="flex items-center justify-between">
        <span className="label-case text-[10px] text-ink-faint">Дело №{caseNo}</span>
        <span className="label-case text-[10px]" style={{ color: level.unlocked ? accent : "var(--color-ink-faint)" }}>
          {level.typeLabel.split(" ")[0]}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 font-display text-xl font-semibold"
          style={{
            borderColor: level.unlocked ? accent : "var(--color-line-strong)",
            color: level.unlocked ? accent : "var(--color-ink-faint)",
            filter: level.unlocked ? "none" : "grayscale(1)",
          }}
        >
          {level.displayName.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-base font-semibold text-ink">{level.unlocked ? level.displayName : "?????"}</div>
          <div className="truncate font-mono text-xs text-ink-muted">{level.position}</div>
        </div>
      </div>

      <div className="text-xs text-ink-muted">{level.scenarioTitle}</div>

      <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i < level.bestStars ? "text-accent" : "text-line-strong"}>
              ★
            </span>
          ))}
        </div>
        <span className="font-mono text-[11px] text-ink-faint">
          {level.attempts > 0 ? `попыток: ${level.attempts}` : "не пройдено"}
        </span>
      </div>

      {!level.unlocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-void/80 backdrop-blur-[2px]">
          <span className="text-2xl">🔒</span>
          <span className="max-w-[80%] text-center text-[11px] text-ink-muted">Нужно 2★ на предыдущем уровне</span>
        </div>
      )}
    </div>
  );

  if (!level.unlocked) return inner;

  return (
    <Link href={`/brief/${level.levelId}`} className="block h-full">
      {inner}
    </Link>
  );
}
