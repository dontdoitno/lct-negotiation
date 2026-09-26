import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersona, getScenario, listLevels } from "@/lib/content/loader";
import { StartCallButton } from "@/components/StartCallButton";

export default async function BriefPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  const levels = listLevels();
  const idx = levels.findIndex((l) => l.persona.id === levelId);
  if (idx === -1) notFound();

  const persona = getPersona(levelId);
  const scenario = getScenario(persona.scenarioId);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-12">
      <Link href="/" className="label-case w-fit text-[11px] text-ink-faint hover:text-ink-muted">
        ← карта уровней
      </Link>

      <div className="flex flex-col gap-6 rounded-xl border border-line bg-panel p-8">
        <div className="flex items-baseline justify-between">
          <span className="label-case text-[11px] text-ink-faint">
            Сценарий · уровень {idx + 1}
          </span>
        </div>

        <h1 className="font-display text-2xl font-bold text-ink">{scenario.title}</h1>

        <section className="flex flex-col gap-2">
          <span className="label-case text-[11px] text-insight">Ситуация</span>
          <p className="text-sm leading-relaxed text-ink-muted">{scenario.context}</p>
        </section>

        <section className="flex flex-col gap-2">
          <span className="label-case text-[11px] text-insight">Ваша роль</span>
          <p className="text-sm text-ink">{scenario.playerRole}</p>
        </section>

        <section className="flex flex-col gap-2">
          <span className="label-case text-[11px] text-insight">Ваши цели</span>
          <ul className="flex flex-col gap-1.5">
            {scenario.playerGoals.map((g) => (
              <li key={g.id} className="flex items-center gap-2 text-sm text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
                {g.text}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-center gap-3 rounded-md border border-line bg-panel-sunken p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink-faint font-display text-lg font-semibold text-ink-muted">
            {persona.displayName.charAt(0)}
          </div>
          <div>
            <div className="font-display text-sm font-semibold text-ink">
              {persona.displayName}, {persona.position}
            </div>
            <div className="text-xs text-ink-muted">Чего он(а) хочет на самом деле — предстоит выяснить в разговоре.</div>
          </div>
        </section>

        <div className="mt-2 flex justify-center">
          <StartCallButton levelId={levelId} />
        </div>
      </div>
    </main>
  );
}
