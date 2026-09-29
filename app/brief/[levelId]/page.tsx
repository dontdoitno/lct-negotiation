import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLevel } from "@/lib/scenarios/runtime";
import { BriefBottomBar } from "@/components/brief/BriefBottomBar";
import { avatarPosterSrc, isAvatarId } from "@/lib/scenarios/avatars";

/**
 * Numbered section: marker rail on the left, content on the right.
 *
 * The numbers mark reading ORDER (the situation has to land before the task
 * makes sense) — they are not a progress indicator. Everything fits on one
 * screen, so there is no progress to indicate.
 */
function Section({
  index,
  title,
  children,
  last,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section
      className={`grid grid-cols-1 gap-x-8 gap-y-5 py-8 lg:grid-cols-[150px_minmax(0,1fr)] ${
        last ? "" : "border-b-[1.5px] border-border-strong"
      }`}
    >
      <div>
        <div className="font-mono text-[13px] text-secondary">{index}</div>
        <h2 className="mt-0.5 text-[19px] font-bold leading-tight text-primary">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default async function BriefPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  const level = await getLevel(levelId);
  if (!level) notFound();

  const { persona, scenario } = level;
  const constraints = scenario.managerConstraints ?? [];

  return (
    <div className="min-h-screen bg-surface text-primary">
      {/* pb clears the fixed one-row bottom bar (~64px) with margin. */}
      <main className="mx-auto max-w-wide px-8 pb-24 pt-5">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <Link
            href="/cases"
            className="text-[14px] text-primary underline underline-offset-4 hover:text-accent"
          >
            ← Назад к выбору сценария
          </Link>
          <h1 className="text-[19px] font-bold leading-tight text-primary">{scenario.title}</h1>
        </header>

        <div className="border-t-[1.5px] border-border-strong">
          <Section index="01" title="Ситуация">
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 xl:grid-cols-2">
              <div className="flex gap-4">
                {/* Тот же кадр, что и в окне звонка: собеседник должен быть
                    узнаваем до разговора. Сценариям без аватара остаётся
                    прежний серый круг. */}
                {isAvatarId(persona.avatar) ? (
                  <Image
                    src={avatarPosterSrc(persona.avatar)}
                    alt={`Фотография: ${persona.displayName}`}
                    width={76}
                    height={76}
                    unoptimized
                    className="h-[76px] w-[76px] shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full bg-muted text-[12px] text-secondary"
                    aria-hidden="true"
                  >
                    фото
                  </div>
                )}
                <div>
                  <h3 className="text-[24px] font-bold leading-tight text-primary">{persona.displayName}</h3>
                  <p className="mt-0.5 text-[15px] text-secondary">
                    {/* {persona.position} */}
                    {persona.tenure ? ` · ${persona.tenure}` : ""}
                  </p>
                  {persona.behaviorNote && (
                    <p className="mt-2.5 text-[15px] leading-snug text-primary">{persona.behaviorNote}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="label-case text-[10px] text-secondary">Что произошло</h4>
                <p className="mt-2 text-[15px] leading-snug text-primary">{scenario.context}</p>
                {persona.trigger && (
                  <p className="mt-2.5 text-[15px] font-bold leading-snug text-primary">{persona.trigger}</p>
                )}
              </div>
            </div>
          </Section>

          <Section index="02" title="Ваша задача">
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 xl:grid-cols-2">
              <div>
                <h4 className="label-case text-[10px] text-secondary">Ваша роль</h4>
                <p className="mt-2 text-[15px] leading-snug text-primary">
                  {scenario.playerRoleDescription ?? scenario.playerRole}
                </p>
              </div>

              <div className="rounded-lg border-2 border-border-strong bg-body p-4">
                <h4 className="label-case text-[10px] text-secondary">Цель и критерий успеха</h4>
                <p className="mt-2 text-[16px] font-bold leading-snug text-primary">
                  {scenario.successCriterion ?? scenario.playerGoals.map((g) => g.text).join(". ")}
                </p>
              </div>
            </div>
          </Section>

          {constraints.length > 0 && (
            <Section index="03" title="Рамки" last>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {constraints.map((c) => (
                  <li
                    key={c}
                    className="flex gap-2.5 rounded-lg border-[1.5px] border-border p-3.5 text-[15px] leading-snug text-primary"
                  >
                    <span aria-hidden="true" className="text-secondary">
                      ×
                    </span>
                    {/* Content stores these as bare infinitives ("уволить другого
                        сотрудника") so the actor prompt can list them under a
                        "cannot" heading; on screen each one has to stand alone. */}
                    <span>Нельзя {c}.</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </main>

      <BriefBottomBar levelId={levelId} />
    </div>
  );
}
