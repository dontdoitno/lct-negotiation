import { getUserId } from "@/lib/user";
import { getLevelMap } from "@/lib/progress";
import { CaseCard } from "@/components/CaseCard";
import { LearnBanner } from "@/components/LearnBanner";

export default async function LevelMapPage() {
  const userId = await getUserId();
  const levels = await getLevelMap(userId);
  const passed = levels.filter((l) => l.bestStars > 0).length;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <span className="label-case text-xs text-ink-faint">Тренажёр управленческих переговоров</span>
        <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">Разбор полётов</h1>
        <p className="max-w-xl text-sm text-ink-muted">
          Один и тот же сотрудник, три типа характера. Состояние на экране считает движок, а не языковая модель — исход
          воспроизводим, и продавить персонажа нельзя.
        </p>
      </header>

      <LearnBanner />

      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-raised">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-500"
            style={{ width: `${(passed / Math.max(1, levels.length)) * 100}%` }}
          />
        </div>
        <span className="font-mono text-xs text-ink-muted">
          Пройдено {passed} из {levels.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {levels.map((level, i) => (
          <CaseCard key={level.levelId} level={level} index={i} />
        ))}
      </div>
    </main>
  );
}
