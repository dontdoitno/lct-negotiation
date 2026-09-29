import Link from "next/link";
import { Text, Heading } from "@astryxdesign/core/Text";
import { CaseTileData } from "@/lib/flow/types";
import { CASES } from "@/lib/flow/copy";
import { DifficultyPreset } from "@/lib/scenarios/types";
import { MetricRadar } from "@/components/ui/MetricRadar";
import { DIFFICULTY_PRESETS } from "@/lib/scenarios/presets";
import { SEVERITY_CLASS, severityOfDifficulty } from "@/lib/flow/severity";

/**
 * Карточка разговора. Четыре состояния, и у каждого своя работа.
 *
 * Рекомендованная выделена рамкой и единственная несёт кнопку: на первом
 * заходе взгляду нужна ровно одна точка входа. Закрытая не ссылка вовсе,
 * поэтому она выпадает из обхода с клавиатуры, а клик по ней ничего не делает.
 */
export function CaseTile({ data }: { data: CaseTileData }) {
  const locked = data.state === "locked";
  const recommended = data.state === "recommended";

  if (locked) {
    return (
      <li className="cursor-default">
        <article className="flex h-full min-h-44 flex-col gap-2 rounded-2xl border border-border bg-muted px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <Text type="supporting" color="disabled">
              {CASES.callLabel(data.callNumber)}
            </Text>
            <LockIcon />
          </div>
          <DifficultyChip difficulty={data.difficulty} muted />
          <span className="block text-[19px] text-disabled">{data.displayName}</span>
          <div className="mt-auto max-w-40">
            <Text type="supporting" color="disabled" display="block">
              {CASES.lockedNote}
            </Text>
          </div>
        </article>
      </li>
    );
  }

  return (
    <li>
      <Link href={`/brief/${data.levelId}`} className="group block h-full">
        <article
          className={`flex h-full min-h-44 flex-col gap-2 rounded-2xl bg-surface px-5 py-4 motion-safe:transition-shadow ${
            recommended
              ? "border-2 border-border-strong"
              : "border border-border group-hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            {/* Тип личности не показывается: определить его — задача участника. */}
            <Text type="supporting" color="secondary">
              {CASES.callLabel(data.callNumber)}
            </Text>
            {recommended && (
              <span className="shrink-0 rounded-full bg-inverted px-2.5 py-1 text-[12px] font-bold text-surface">
                {CASES.recommendedBadge}
              </span>
            )}
          </div>

          <Heading level={3} maxLines={1}>
            {data.displayName}
          </Heading>

          <div className="flex items-center justify-between gap-3">
            <Text type="supporting" color="secondary">
              {recommended
                ? CASES.recommendedNote
                : data.attempts > 0
                  ? CASES.attempts(data.attempts)
                  : CASES.noAttempts}
            </Text>
            {/* Радар пройденного кейса стоит здесь, а не в шапке: там он
                конкурировал с номером созвона и обрезался до подписей осей. */}
            {!recommended && data.bestMetrics && (
              <MetricRadar end={data.bestMetrics} size={56} />
            )}
          </div>

          <div className="mt-auto pt-2">
            <DifficultyChip difficulty={data.difficulty} />
          </div>

          {recommended && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-inverted px-4 py-3">
              <span className="text-[15px] font-bold text-surface">{CASES.startCall}</span>
              <ArrowRight />
            </div>
          )}
        </article>
      </Link>
    </li>
  );
}

/**
 * Чип сложности. Цвет подсказывает, чего ждать, но сложность всегда написана
 * словом — по одному цвету её различать не приходится.
 */
function DifficultyChip({ difficulty, muted }: { difficulty: DifficultyPreset; muted?: boolean }) {
  const tone = SEVERITY_CLASS[severityOfDifficulty(difficulty)].chip;
  return (
    <span
      className={`inline-block w-fit rounded-full border px-2 py-0.5 text-[12px] ${
        muted ? "border-border text-disabled" : tone
      }`}
    >
      {DIFFICULTY_PRESETS[difficulty].label}
    </span>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 text-disabled">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-surface">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
