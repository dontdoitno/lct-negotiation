"use client";

import Image from "next/image";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { ScenarioDraft } from "@/lib/scenarios/types";
import { hiddenPreview, playerPreview } from "@/lib/scenarios/preview";
import { avatarPosterSrc, isAvatarId } from "@/lib/scenarios/avatars";
import { METRIC_META } from "@/lib/engine/labels";

/**
 * Превью сценария до запуска. Две колонки: слева то, что прочитает игрок,
 * справа то, что от него скрыто.
 *
 * Нужно оно ради одной проверки, которую иначе делать долго: убедиться, что
 * правка в форме действительно меняет разговор. Раньше для этого приходилось
 * запускать тест-прогон и отыгрывать несколько реплик.
 *
 * Превью живое и считается из черновика, а не из сохранённой записи, поэтому
 * показывает в том числе несохранённые правки.
 */
export function ScenarioPreview({ draft, onClose }: { draft: ScenarioDraft; onClose: () => void }) {
  const player = playerPreview(draft);
  const hidden = hiddenPreview(draft);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Превью сценария"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-wide rounded-2xl border-[1.5px] border-border-strong bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b-[1.5px] border-border px-6 py-4">
          <div>
            <Text type="label" color="secondary" display="block">
              Превью сценария
            </Text>
            <Heading level={2}>{player.title || "Без названия"}</Heading>
          </div>
          <Button variant="secondary" size="sm" label="Закрыть" onClick={onClose} />
        </header>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
          {/* --- Что видит игрок ------------------------------------------ */}
          <section className="rounded-xl border-[1.5px] border-border p-5">
            <Text type="label" color="secondary" display="block">
              Что видит игрок в брифинге
            </Text>

            <div className="mt-4 flex gap-4">
              {isAvatarId(player.avatar) ? (
                <Image
                  src={avatarPosterSrc(player.avatar)}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                  className="h-16 w-16 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Text type="supporting" color="disabled">
                    фото
                  </Text>
                </div>
              )}
              <div className="min-w-0">
                <Heading level={3}>{player.npcName || "Имя не задано"}</Heading>
                <Text type="supporting" color="secondary" display="block">
                  {player.npcPosition || "должность не задана"}
                </Text>
                {player.characterNote && (
                  <div className="mt-2">
                    <Text as="p" display="block">
                      {player.characterNote}
                    </Text>
                  </div>
                )}
              </div>
            </div>

            <Block title="Что произошло">
              <Text as="p" display="block">
                {player.situation || "Контекст не заполнен."}
              </Text>
              {player.trigger && (
                <div className="mt-2">
                  <Text as="p" display="block" weight="bold">
                    {player.trigger}
                  </Text>
                </div>
              )}
            </Block>

            <Block title="Ваша роль">
              <Text as="p" display="block">
                {player.playerRole || "Роль не задана."}
              </Text>
            </Block>

            <Block title="Цель и критерий успеха">
              {player.successCriteria.length === 0 ? (
                <Text as="p" display="block" color="disabled">
                  Не заполнено.
                </Text>
              ) : (
                <ul className="flex flex-col gap-1">
                  {player.successCriteria.map((c) => (
                    <li key={c}>
                      <Text as="p" display="block">
                        {c}
                      </Text>
                    </li>
                  ))}
                </ul>
              )}
            </Block>

            {player.constraints.length > 0 && (
              <Block title="Рамки">
                <ul className="flex flex-col gap-1">
                  {player.constraints.map((c) => (
                    <li key={c}>
                      <Text as="p" display="block">
                        Нельзя {c}.
                      </Text>
                    </li>
                  ))}
                </ul>
              </Block>
            )}

            <div className="mt-5 border-t border-border pt-3">
              <Text type="supporting" color="secondary" display="block">
                Разговор начинает: {player.whoStarts || "не задано"}. Характер собеседника игроку
                нигде не показывается.
              </Text>
            </div>
          </section>

          {/* --- Что скрыто ----------------------------------------------- */}
          <section className="rounded-xl border-[1.5px] border-border-strong bg-body p-5">
            <Text type="label" color="secondary" display="block">
              Только для администратора
            </Text>

            <Block title="Стартовые метрики">
              <ul className="flex flex-col gap-1.5">
                {hidden.startMetrics.map((m) => (
                  <li key={m.code} className="flex items-center justify-between gap-3">
                    <Text type="supporting">{METRIC_META[m.code].label}</Text>
                    <span className="font-mono text-[14px] tabular-nums text-primary">{m.value}</span>
                  </li>
                ))}
              </ul>
            </Block>

            <Block title="Скрытые интересы">
              {hidden.layers.length === 0 ? (
                <Text as="p" display="block" color="disabled">
                  Слои не заполнены.
                </Text>
              ) : (
                <ol className="flex flex-col gap-2">
                  {hidden.layers.map((l) => (
                    <li key={l.index} className="rounded-lg border border-border bg-surface px-3 py-2">
                      <Text type="label" color="secondary" display="block">
                        Слой {l.index} · откроется при доверии от {l.trustThreshold}
                      </Text>
                      <Text as="p" display="block">
                        {l.text}
                      </Text>
                    </li>
                  ))}
                </ol>
              )}
              <div className="mt-2">
                <Text type="supporting" color="secondary" display="block">
                  Нужно {hidden.layerRevealCost} конструктивных действий подряд на один слой.
                </Text>
              </div>
            </Block>

            <Block title="Ход разговора">
              <Row label="Лимит реплик" value={String(hidden.turnLimit)} />
              <Row label="Чувствительность" value={hidden.sensitivity.toFixed(2)} />
            </Block>

            <Block title="Собеседник">
              <Row label="Его цель" value={hidden.npcGoal || "не задана"} />
              <Row label="Реплика на выходе" value={hidden.exitLine || "не задана"} />
              <Row
                label="Ориентир первой реплики"
                value={hidden.openingLineBrief || "не задан"}
              />
              <Row
                label="Предыстория в промт"
                value={hidden.npcBackstory || "не задана"}
              />
              <Row label="Поколение" value={hidden.generation} />
            </Block>
          </section>
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <Text type="label" color="secondary" display="block">
        {title}
      </Text>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-1.5 last:border-0 sm:flex-row sm:justify-between sm:gap-4">
      <Text type="supporting" color="secondary">
        {label}
      </Text>
      <span className="min-w-0 sm:max-w-[60%] sm:text-right">
        <Text type="supporting">{value}</Text>
      </span>
    </div>
  );
}
