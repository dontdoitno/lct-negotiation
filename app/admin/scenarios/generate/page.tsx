"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ChoiceRow, ComboBox, Field } from "@/components/admin/fields";
import { DIFFICULTY_PRESETS, DOMAIN_OPTIONS } from "@/lib/scenarios/presets";
import { DifficultyPreset, Tone } from "@/lib/scenarios/types";

type State = "idle" | "loading" | "error";

/**
 * Генерация черновика. Форма ровно из шести полей, которые ТЗ называет
 * контекстом на входе. Модель заполняет тексты, поведение персонажа приходит
 * из пресета тона.
 */
export default function GenerateScenarioPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");

  const [domain, setDomain] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyPreset>("normal");
  const [tone, setTone] = useState<Tone>("rational");
  const [npcRole, setNpcRole] = useState("");
  const [npcPosition, setNpcPosition] = useState("");
  const [npcGoal, setNpcGoal] = useState("");

  const ready = domain.trim() !== "" && topic.trim() !== "";

  async function generate() {
    setState("loading");
    try {
      const res = await fetch("/api/admin/scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, topic, difficulty, tone, npcRole, npcPosition, npcGoal }),
      });
      if (!res.ok) throw new Error("generation failed");
      const data = (await res.json()) as { id: string };
      router.push(`/admin/scenarios/${data.id}/edit`);
    } catch {
      setState("error");
    }
  }

  return (
    <main className="mx-auto max-w-reading px-6 py-8">
      <Heading level={1} type="display-3">
        Сгенерировать сценарий
      </Heading>
      <div className="mt-2">
        <Text as="p" display="block" color="secondary">
          Модель заполнит контекст, слои скрытых интересов, цели, критерии успеха, ресурсы и ограничения. Результат
          откроется в конструкторе как черновик — все поля можно поправить.
        </Text>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-lg border-[1.5px] border-border bg-surface p-4">
        <ComboBox label="Сфера" value={domain} options={DOMAIN_OPTIONS} onChange={setDomain} />

        <Field label="Тема переговоров">
          <TextInput
            label="Тема"
            isLabelHidden
            value={topic}
            onChange={setTopic}
            placeholder="Сотрудник просит повышение, а бюджет закрыт"
          />
        </Field>

        <ChoiceRow
          label="Сложность"
          options={(["easy", "normal", "hard"] as DifficultyPreset[]).map((d) => ({
            value: d,
            label: DIFFICULTY_PRESETS[d].label,
          }))}
          value={difficulty}
          onChange={setDifficulty}
        />

        <ChoiceRow
          label="Тон собеседника"
          options={[
            { value: "aggressive" as Tone, label: "Агрессивный" },
            { value: "anxious" as Tone, label: "Тревожный" },
            { value: "rational" as Tone, label: "Рациональный" },
          ]}
          value={tone}
          onChange={setTone}
        />

        <Field label="Роль собеседника" hint="Кем он выступает в переговорах.">
          <TextInput
            label="Роль собеседника"
            isLabelHidden
            value={npcRole}
            onChange={setNpcRole}
            placeholder="Сотрудник, покупатель, поставщик"
          />
        </Field>

        <Field label="Должность собеседника">
          <TextInput
            label="Должность"
            isLabelHidden
            value={npcPosition}
            onChange={setNpcPosition}
            placeholder="Middle-разработчик"
          />
        </Field>

        <Field label="Цель собеседника">
          <TextInput
            label="Цель"
            isLabelHidden
            value={npcGoal}
            onChange={setNpcGoal}
            placeholder="Добиться пересмотра зарплаты"
          />
        </Field>
      </div>

      {state === "error" && (
        <div className="mt-4 rounded-md border-[1.5px] border-metric-resistance px-3 py-2">
          <Text as="p" display="block" type="supporting">
            Не получилось сгенерировать черновик. Попробуйте ещё раз или заполните сценарий руками.
          </Text>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          label={state === "loading" ? "Генерируем, это займёт несколько секунд…" : "Сгенерировать черновик"}
          isDisabled={!ready || state === "loading"}
          onClick={() => void generate()}
        />
        <Link href="/admin/scenarios/new">
          <Button variant="secondary" label="Заполнить руками" />
        </Link>
        <Link href="/admin">
          <Button variant="ghost" label="Отмена" />
        </Link>
      </div>

      <div className="mt-4">
        <Text type="supporting" color="secondary">
          Если модель недоступна, черновик всё равно создастся: поля заполнятся значениями из ближайшего пресета.
        </Text>
      </div>
    </main>
  );
}
