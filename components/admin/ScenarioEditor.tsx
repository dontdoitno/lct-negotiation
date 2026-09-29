"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Badge } from "@astryxdesign/core/Badge";
import { MetricCode } from "@/lib/engine/types";
import { METRIC_META } from "@/lib/engine/labels";
import {
  applyDifficultyPreset,
  applyTonePreset,
  canPublish,
  cleanDraft,
  incompleteSections,
  invalidFields,
  resetReactionsToPreset,
  SectionId,
  setExactMetric,
  validateDraft,
} from "@/lib/scenarios/draft";
import { renderPrompt } from "@/lib/scenarios/promptRender";
import { DIFFICULTY_PRESETS, DOMAIN_OPTIONS } from "@/lib/scenarios/presets";
import {
  DifficultyPreset,
  METRIC_LEVEL_LABEL,
  MetricLevel,
  REACTION_LEVELS,
  REACTION_LEVEL_LABEL,
  ReactionLevel,
  ScenarioDraft,
  Tone,
} from "@/lib/scenarios/types";
import { ACTION_CODES, ActionCode } from "@/lib/engine/types";
import { ACTION_BADGE } from "@/lib/flow/copy";
import {
  ChoiceRow,
  ComboBox,
  Field,
  NumberField,
  Slider,
  StringListField,
  TextArea,
  Toggle,
} from "./fields";

const SECTIONS: { id: SectionId; title: string }[] = [
  { id: "context", title: "1. Контекст" },
  { id: "npc", title: "2. Собеседник" },
  { id: "layers", title: "3. Скрытые интересы" },
  { id: "goals", title: "4. Цели игрока" },
  { id: "resources", title: "5. Ресурсы и ограничения" },
  { id: "difficulty", title: "6. Сложность" },
  { id: "reactions", title: "7. Реакции" },
  { id: "prompt", title: "8. Системный промт" },
];

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "aggressive", label: "Агрессивный" },
  { value: "anxious", label: "Тревожный" },
  { value: "rational", label: "Рациональный" },
  { value: "custom", label: "Свой" },
];

const METRICS: MetricCode[] = ["R", "T", "I", "S", "C", "A"];
const LEVELS: MetricLevel[] = ["low", "medium", "high"];
const AUTOSAVE_MS = 20_000;

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Конструктор сценария. Одна страница с секциями и липкой якорной навигацией,
 * а не пошаговый мастер: чаще всего админ приходит поправить одно поле в
 * готовом сценарии, и мастер заставлял бы его листать всё.
 */
export function ScenarioEditor({
  scenarioId,
  initial,
  initialStatus,
  promptTemplate,
}: {
  scenarioId: string | null;
  initial: ScenarioDraft;
  initialStatus: "draft" | "published";
  /** Шаблон приходит с сервера: он лежит в файле, а предпросмотр живой. */
  promptTemplate: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ScenarioDraft>(initial);
  const [id, setId] = useState<string | null>(scenarioId);
  const [status, setStatus] = useState(initialStatus);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [active, setActive] = useState<SectionId>("context");
  const [showIssues, setShowIssues] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [manualPrompt, setManualPrompt] = useState(initial.customPrompt !== null);

  // Грязный черновик: сравниваем с последним сохранённым снимком, а не с
  // исходным, иначе индикатор навсегда останется в «не сохранено». Снимок
  // живёт в состоянии, а не в ref: ref нельзя читать во время рендера.
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial));
  const dirty = JSON.stringify(draft) !== savedSnapshot;

  const issues = useMemo(() => validateDraft(draft), [draft]);
  const incomplete = useMemo(() => incompleteSections(draft), [draft]);
  const invalid = useMemo(() => invalidFields(draft), [draft]);

  /** Красная обводка появляется только после неудачной попытки сохранить или
      опубликовать: подсвечивать пустые поля сразу при открытии формы значит
      ругаться на человека до того, как он что-то сделал. */
  const fieldStatus = (field: Parameters<typeof invalid.get>[0]) =>
    showIssues && invalid.has(field)
      ? ({ type: "error" as const, message: invalid.get(field) })
      : undefined;
  const prompt = useMemo(() => renderPrompt(promptTemplate, draft), [promptTemplate, draft]);

  const patch = useCallback((next: Partial<ScenarioDraft>) => {
    setDraft((prev) => ({ ...prev, ...next }));
  }, []);

  const save = useCallback(
    async (nextStatus?: "draft" | "published") => {
      setSaveState("saving");
      setSaveError(null);
      const payload = cleanDraft(draft);
      try {
        const res = id
          ? await fetch(`/api/admin/scenarios/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/admin/scenarios", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
        if (!res.ok) {
          const detail = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(detail?.error ?? `Сервер ответил ${res.status}`);
        }
        const data = (await res.json()) as { scenario: { id: string; status: "draft" | "published" } };

        const currentId = data.scenario.id;
        setId(currentId);

        if (nextStatus && nextStatus !== data.scenario.status) {
          const patched = await fetch(`/api/admin/scenarios/${currentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
          });
          if (!patched.ok) throw new Error("status failed");
          setStatus(nextStatus);
        } else {
          setStatus(data.scenario.status);
        }

        setSavedSnapshot(JSON.stringify(draft));
        setSaveState("saved");

        // Новый сценарий получил id: переводим адрес на страницу правки, чтобы
        // перезагрузка не создала второй такой же.
        if (!scenarioId && currentId) {
          window.history.replaceState(null, "", `/admin/scenarios/${currentId}/edit`);
        }
        return currentId;
      } catch (error) {
        setSaveState("error");
        setSaveError(error instanceof Error ? error.message : "Неизвестная ошибка");
        // Подсвечиваем незаполненное: чаще всего сохранение ломается именно
        // из-за него, и человеку надо видеть, где именно.
        if (validateDraft(draft).length > 0) setShowIssues(true);
        return null;
      }
    },
    [draft, id, scenarioId],
  );

  // Автосохранение черновика. Опубликованный сценарий сам не пересохраняется:
  // иначе правка на живом каталоге уезжала бы к игрокам до того, как её
  // закончили.
  useEffect(() => {
    if (!dirty || status === "published") return;
    const timer = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [dirty, status, save]);

  // Подсветка в навигации следует за скроллом. Активной считается последняя
  // секция, чей верх прошёл под липкой панелью: так подсветка совпадает с тем,
  // что человек реально читает, а не с тем, что едва показалось снизу.
  useEffect(() => {
    const ANCHOR_LINE = 140;

    function recompute() {
      let current: SectionId = SECTIONS[0].id;
      for (const section of SECTIONS) {
        const el = document.getElementById(`section-${section.id}`);
        if (el && el.getBoundingClientRect().top <= ANCHOR_LINE) current = section.id;
      }
      // У последней секции может не хватить высоты, чтобы дойти до линии.
      // Докрутили до низа — значит читают именно её.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = SECTIONS[SECTIONS.length - 1].id;
      }
      setActive((prev) => (prev === current ? prev : current));
    }

    let frame = requestAnimationFrame(recompute);
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(recompute);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Предупреждение при уходе со страницы с несохранёнными изменениями.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function publish() {
    if (!canPublish(draft)) {
      setShowIssues(true);
      setActive(issues[0]?.section ?? "context");
      document.getElementById(`section-${issues[0]?.section}`)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const savedId = await save("published");
    if (savedId) router.push("/admin");
  }

  async function testRun() {
    const savedId = await save();
    if (savedId) router.push(`/admin/scenarios/${savedId}/test`);
  }

  return (
    <div className="mx-auto max-w-wide px-6 pb-16">
      {/* Липкая панель: название, статус и действия всегда под рукой */}
      <div className="sticky top-0 z-20 -mx-6 border-b-[1.5px] border-border bg-body/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-64 flex-1">
            <TextInput
              label="Название сценария"
              isLabelHidden
              value={draft.title}
              onChange={(next) => patch({ title: next })}
              placeholder="Название сценария"
              status={fieldStatus("title")}
              statusVariant="tooltip"
            />
          </div>
          <Badge label={status === "published" ? "Опубликован" : "Черновик"} />
          <SaveIndicator state={saveState} dirty={dirty} />
          <Button variant="secondary" size="sm" label="Сохранить черновик" onClick={() => void save("draft")} />
          <Button variant="secondary" size="sm" label="Тест-прогон" onClick={() => void testRun()} />
          <Button variant="primary" size="sm" label="Опубликовать" onClick={() => void publish()} />
        </div>

      </div>

      {saveError && (
        <div className="mt-2 rounded-md border-[1.5px] border-metric-resistance px-3 py-2">
          <Text type="supporting" display="block" weight="bold">
          Не сохранилось: {saveError}
          </Text>
        </div>
        )}

      {showIssues && issues.length > 0 && (
        <div className="mt-2 rounded-md border-[1.5px] border-metric-resistance px-3 py-2">
          <Text type="supporting" display="block" weight="bold">
          Не заполнены обязательные поля. Они подсвечены красным:
          </Text>
          <ul className="mt-1 list-inside list-disc">
          {issues.map((i) => (
            <li key={i.message}>
            <Text type="supporting">{i.message}</Text>
            </li>
          ))}
          </ul>
        </div>
        )}

      <div className="mt-6 flex gap-8">
        {/* Якорная навигация с отметкой заполненности */}
        <nav className="sticky top-24 hidden h-fit w-56 shrink-0 flex-col gap-0.5 lg:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#section-${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                setActive(s.id);
                document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`flex items-center justify-between rounded-md border-l-2 px-3 py-1.5 motion-safe:transition-all motion-safe:duration-200 ${
                active === s.id
                  ? "border-accent bg-surface"
                  : "border-transparent hover:bg-surface"
              }`}
            >
              <Text type="supporting" color={active === s.id ? "primary" : "secondary"} weight={active === s.id ? "bold" : "normal"}>
                {s.title}
              </Text>
              {incomplete.has(s.id) && (
                <span className="ml-2 inline-block size-1.5 rounded-full bg-[var(--metric-resistance)]" />
              )}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <Section id="context" title="1. Контекст">
            <ComboBox
              label="Сфера"
              value={draft.domain}
              options={DOMAIN_OPTIONS}
              onChange={(next) => patch({ domain: next })}
              placeholder="Например, управление командой"
              error={showIssues ? invalid.get("domain") : undefined}
            />
            <Field label="Тема переговоров">
              <TextInput
                label="Тема"
                isLabelHidden
                value={draft.topic}
                onChange={(next) => patch({ topic: next })}
                placeholder="Перегрузка сотрудника"
                status={fieldStatus("topic")}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Роль игрока" hint="Кем в этом разговоре выступает участник.">
                <TextInput
                  label="Роль игрока"
                  isLabelHidden
                  value={draft.playerRole}
                  onChange={(next) => patch({ playerRole: next })}
                  placeholder="Руководитель отдела"
                  status={fieldStatus("playerRole")}
                />
              </Field>
              <Field label="Роль ИИ" hint="Кем выступает собеседник: сотрудник, покупатель, поставщик.">
                <TextInput
                  label="Роль ИИ"
                  isLabelHidden
                  value={draft.npcRole}
                  onChange={(next) => patch({ npcRole: next })}
                  placeholder="Сотрудник"
                  status={fieldStatus("npcRole")}
                />
              </Field>
            </div>
            <StringListField
              label="Контекст"
              hint="Два-три пункта: что за проект, что случилось, почему разговор происходит сейчас."
              items={draft.context}
              onChange={(next) => patch({ context: next })}
              addLabel="Добавить пункт"
            />
            {/* Подписи берутся из ролей выше: пара «сотрудник и руководитель»
                верна только для управления командой, а сфер больше. */}
            <ChoiceRow
              label="Кто начинает разговор"
              options={[
                { value: "npc" as const, label: (draft.npcRole ?? "").trim() || "Собеседник" },
                { value: "player" as const, label: (draft.playerRole ?? "").trim() || "Игрок" },
              ]}
              value={draft.initiator}
              onChange={(next) => patch({ initiator: next })}
            />
          </Section>

          <Section id="npc" title="2. Собеседник">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Имя">
                <TextInput
                  label="Имя"
                  isLabelHidden
                  value={draft.npcName}
                  onChange={(next) => patch({ npcName: next })}
                  status={fieldStatus("npcName")}
                />
              </Field>
              <Field label="Должность">
                <TextInput
                  label="Должность"
                  isLabelHidden
                  value={draft.npcPosition}
                  onChange={(next) => patch({ npcPosition: next })}
                  status={fieldStatus("npcPosition")}
                />
              </Field>
            </div>

            <ChoiceRow
              label="Тон собеседника"
              options={TONE_OPTIONS}
              value={draft.tone}
              onChange={(next) => setDraft((prev) => applyTonePreset(prev, next))}
              hint={
                draft.tone === "custom"
                  ? "Свой характер: поведение задаёт только матрица реакций ниже."
                  : "Значения подставлены из пресета, их можно менять."
              }
            />

            <Field label="Расшифровка характера" hint="Одна строка. Её видит игрок в брифинге.">
              <TextInput
                label="Расшифровка"
                isLabelHidden
                value={draft.characterNote}
                onChange={(next) => patch({ characterNote: next })}
              />
            </Field>

            <Field label="Темперамент">
              <TextArea value={draft.temperament} onChange={(next) => patch({ temperament: next })} rows={4} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <StringListField label="Триггеры" items={draft.triggers} onChange={(next) => patch({ triggers: next })} />
              <StringListField
                label="Что располагает"
                items={draft.soothers}
                onChange={(next) => patch({ soothers: next })}
              />
            </div>

            <Field label="Цель собеседника" error={showIssues ? invalid.get("npcGoal") : undefined}>
              <TextArea
                value={draft.npcGoal}
                onChange={(next) => patch({ npcGoal: next })}
                rows={2}
                hasError={showIssues && invalid.has("npcGoal")}
              />
            </Field>

            <Field label="Первая реплика" hint="С неё начинается разговор, если инициатор — сотрудник.">
              <TextArea value={draft.openingLine} onChange={(next) => patch({ openingLine: next })} rows={3} />
            </Field>

            <Field label="Реплика на выходе" hint="Как собеседник заканчивает разговор при срыве.">
              <TextInput
                label="Реплика на выходе"
                isLabelHidden
                value={draft.exitLine}
                onChange={(next) => patch({ exitLine: next })}
              />
            </Field>
          </Section>

          <Section
            id="layers"
            title="3. Скрытые интересы"
            hint="Слои раскрываются по порядку. Игрок увидит нераскрытые слои только в разборе."
          >
            <StringListField
              label="Слои"
              error={showIssues ? invalid.get("hiddenLayers") : undefined}
              items={draft.hiddenLayers.map((l) => l.text)}
              onChange={(next) => patch({ hiddenLayers: next.map((text) => ({ text })) })}
              addLabel="Добавить слой"
              min={2}
              minHint="Двух слоёв удалить нельзя: это минимум для сценария."
            />
            <NumberField
              label="Сколько правильных действий раскрывает один слой"
              error={showIssues ? invalid.get("layerRevealCost") : undefined}
              value={draft.layerRevealCost}
              min={1}
              max={5}
              onChange={(next) => patch({ layerRevealCost: next })}
            />
          </Section>

          <Section id="goals" title="4. Цели игрока">
            <StringListField
              label="Цели"
              error={showIssues ? invalid.get("playerGoals") : undefined}
              items={draft.playerGoals}
              onChange={(next) => patch({ playerGoals: next })}
            />
            <StringListField
              label="Критерии успеха"
              items={draft.successCriteria}
              onChange={(next) => patch({ successCriteria: next })}
            />
          </Section>

          <Section id="resources" title="5. Ресурсы и ограничения">
            <div className="grid gap-6 lg:grid-cols-2">
              <StringListField
                label="Игрок может"
                error={showIssues ? invalid.get("resources") : undefined}
                items={draft.resources}
                onChange={(next) => patch({ resources: next })}
              />
              <StringListField
                label="Игрок не может"
                items={draft.constraints}
                onChange={(next) => patch({ constraints: next })}
              />
            </div>
          </Section>

          <Section id="difficulty" title="6. Сложность">
            <ChoiceRow
              label="Пресет сложности"
              options={(["easy", "normal", "hard"] as DifficultyPreset[]).map((d) => ({
                value: d,
                label: DIFFICULTY_PRESETS[d].label,
              }))}
              value={draft.difficultyPreset}
              onChange={(next) => setDraft((prev) => applyDifficultyPreset(prev, next))}
              hint={DIFFICULTY_PRESETS[draft.difficultyPreset].description}
            />

            <Field label="Стартовые метрики" hint="Уровень задаёт значение. Число рядом — точная донастройка.">
              <div className="grid gap-2 sm:grid-cols-2">
                {METRICS.map((m) => (
                  <div key={m} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                    <Text type="supporting">{METRIC_META[m].label}</Text>
                    <div className="flex items-center gap-1.5">
                      {LEVELS.map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() =>
                            setDraft((prev) =>
                              setExactMetric(
                                { ...prev, startMetrics: { ...prev.startMetrics, [m]: level } },
                                m,
                                null,
                              ),
                            )
                          }
                          className={`rounded-full border-[1.5px] px-2 py-0.5 text-[12px] ${
                            draft.startMetrics[m] === level
                              ? "border-accent bg-accent text-on-accent"
                              : "border-border text-secondary hover:border-border-strong"
                          }`}
                        >
                          {METRIC_LEVEL_LABEL[level]}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={draft.startMetricsExact?.[m] ?? ""}
                        placeholder="—"
                        onChange={(e) =>
                          setDraft((prev) =>
                            setExactMetric(prev, m, e.target.value === "" ? null : Number(e.target.value)),
                          )
                        }
                        className="w-16 rounded border border-border bg-surface px-2 py-1 font-mono text-[12px] tabular-nums outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Лимит реплик"
                error={showIssues ? invalid.get("turnLimit") : undefined}
                value={draft.turnLimit}
                min={4}
                max={40}
                onChange={(next) => patch({ turnLimit: next })}
              />
              <Slider
                label="Чувствительность"
                hint="Насколько сильно действия игрока двигают метрики."
                value={draft.sensitivity}
                min={0.3}
                max={2}
                step={0.05}
                onChange={(next) => patch({ sensitivity: next })}
              />
            </div>

            <div className="flex flex-wrap gap-5">
              <Toggle
                label="Показывать тип характера в брифинге"
                checked={draft.showTypeInBrief}
                onChange={(next) => patch({ showTypeInBrief: next })}
              />
              <Toggle
                label="Учебный режим по умолчанию"
                checked={draft.trainingModeDefault}
                onChange={(next) => patch({ trainingModeDefault: next })}
              />
            </div>
          </Section>

          <Section id="reactions" title="7. Реакции на действия игрока">
            <div className="flex items-center justify-between gap-3">
              <Text type="supporting" color="secondary">
                Предзаполнено из пресета тона. Пустая ячейка означает «не меняется».
              </Text>
              {draft.tone !== "custom" && (
                <Button
                  variant="ghost"
                  size="sm"
                  label="Сбросить к пресету"
                  onClick={() => setDraft((prev) => resetReactionsToPreset(prev))}
                />
              )}
            </div>
            <ReactionGrid draft={draft} onChange={(reactions) => patch({ reactions })} />
          </Section>

          <Section id="prompt" title="8. Системный промт">
            {manualPrompt ? (
              <>
                <div className="rounded-md border-[1.5px] border-metric-insight px-3 py-2">
                  <Text type="supporting" display="block">
                    Промт правится вручную. Изменения в полях выше на него больше не влияют.
                  </Text>
                </div>
                <TextArea
                  value={draft.customPrompt ?? prompt}
                  onChange={(next) => patch({ customPrompt: next })}
                  rows={20}
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    label="Собрать заново"
                    onClick={() => {
                      patch({ customPrompt: null });
                      setManualPrompt(false);
                    }}
                  />
                  <CopyButton text={draft.customPrompt ?? prompt} />
                </div>
              </>
            ) : (
              <>
                <pre className="max-h-[32rem] overflow-auto rounded-md border-[1.5px] border-border bg-surface p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-primary">
                  {prompt}
                </pre>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    label="Редактировать вручную"
                    onClick={() => {
                      patch({ customPrompt: prompt });
                      setManualPrompt(true);
                    }}
                  />
                  <CopyButton text={prompt} />
                </div>
              </>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  hint,
  children,
}: {
  id: SectionId;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={`section-${id}`} className="scroll-mt-28">
      <Heading level={2}>{title}</Heading>
      {hint && (
        <div className="mt-1">
          <Text type="supporting" color="secondary" display="block">
            {hint}
          </Text>
        </div>
      )}
      <div className="mt-4 flex flex-col gap-4 rounded-lg border-[1.5px] border-border bg-surface p-4">{children}</div>
    </section>
  );
}

function SaveIndicator({ state, dirty }: { state: SaveState; dirty: boolean }) {
  const text =
    state === "saving"
      ? "Сохраняем…"
      : state === "error"
        ? "Не сохранилось"
        : dirty
          ? "Есть несохранённое"
          : state === "saved"
            ? "Сохранено"
            : "";
  if (!text) return null;
  return (
    <Text type="supporting" color={state === "error" ? "inherit" : "secondary"}>
      {text}
    </Text>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      label={copied ? "Скопировано" : "Копировать промт"}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    />
  );
}

/** Таблица «действие × шесть метрик» с селектором влияния в ячейке. */
function ReactionGrid({
  draft,
  onChange,
}: {
  draft: ScenarioDraft;
  onChange: (next: ScenarioDraft["reactions"]) => void;
}) {
  // Нейтральные действия не показываем: у них не бывает влияния на метрики.
  const actions = ACTION_CODES.filter((a) => !["small_talk", "clarify_fact", "off_topic"].includes(a));

  function set(action: ActionCode, metric: MetricCode, level: ReactionLevel | null) {
    const row = { ...(draft.reactions[action] ?? {}) };
    if (level === null) delete row[metric];
    else row[metric] = level;
    onChange({ ...draft.reactions, [action]: row });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse">
        <thead>
          <tr className="border-b-[1.5px] border-border">
            <th className="px-2 py-1.5 text-left">
              <Text type="label" color="secondary">
                Действие
              </Text>
            </th>
            {METRICS.map((m) => (
              <th key={m} className="px-2 py-1.5 text-left">
                <Text type="label" color="secondary">
                  {m}
                </Text>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {actions.map((action) => (
            <tr key={action} className="border-b border-border last:border-b-0">
              <td className="px-2 py-1">
                <Text type="supporting">{ACTION_BADGE[action] ?? action}</Text>
              </td>
              {METRICS.map((m) => (
                <td key={m} className="px-2 py-1">
                  <select
                    value={draft.reactions[action]?.[m] ?? ""}
                    onChange={(e) => set(action, m, (e.target.value || null) as ReactionLevel | null)}
                    className="w-full rounded border border-border bg-surface px-1.5 py-1 text-[12px] text-primary outline-none focus:border-accent"
                  >
                    <option value="">—</option>
                    {REACTION_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {REACTION_LEVEL_LABEL[level]}
                      </option>
                    ))}
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
