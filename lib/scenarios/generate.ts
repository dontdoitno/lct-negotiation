import { z } from "zod";
import { getLLMProvider, isMockMode, Message } from "@/lib/llm/provider";
import { applyDifficultyPreset, applyTonePreset, emptyDraft } from "./draft";
import { DEFAULT_CONSTRAINTS, DEFAULT_RESOURCES, TONE_PRESETS } from "./presets";
import { DifficultyPreset, ScenarioDraft, Tone } from "./types";

/**
 * Генерация черновика сценария по шести полям, которые ТЗ называет контекстом
 * на входе. Модель заполняет только текстовую часть: контекст, слои интересов,
 * цели, критерии успеха, ресурсы и ограничения. Поведение персонажа приходит
 * из пресета тона, а не от модели, иначе воспроизводимость исхода поехала бы.
 */

export interface GenerationInput {
  domain: string;
  topic: string;
  difficulty: DifficultyPreset;
  tone: Tone;
  /** Роль собеседника в переговорах: сотрудник, покупатель, поставщик. */
  npcRole: string;
  npcPosition: string;
  npcGoal: string;
}

const GeneratedSchema = z.object({
  title: z.string().min(3),
  npcName: z.string().min(2),
  context: z.array(z.string()).min(2).max(4),
  hiddenLayers: z.array(z.string()).min(2).max(5),
  playerGoals: z.array(z.string()).min(1).max(4),
  successCriteria: z.array(z.string()).min(1).max(3),
  resources: z.array(z.string()).min(3).max(8),
  constraints: z.array(z.string()).min(1).max(5),
  openingLine: z.string().min(20),
});

type Generated = z.infer<typeof GeneratedSchema>;

function buildPrompt(input: GenerationInput): Message[] {
  const toneLabel = input.tone === "custom" ? "нейтральный" : TONE_PRESETS[input.tone].label;

  return [
    {
      role: "system",
      content: `Ты помогаешь методологу собрать сценарий тренажёра переговоров между руководителем и сотрудником.
Верни строго JSON по схеме, без текста вокруг.

СХЕМА:
{
  "title": "короткое название сценария",
  "npcName": "русское имя сотрудника",
  "context": ["2-3 пункта: что за проект, что случилось, почему разговор сейчас"],
  "hiddenLayers": ["3-4 настоящие причины от поверхностной к глубокой, от первого лица"],
  "playerGoals": ["1-3 цели руководителя в этом разговоре"],
  "successCriteria": ["1-2 формулировки, что считается успехом"],
  "resources": ["4-7 пунктов: что руководитель реально может предложить"],
  "constraints": ["2-3 пункта: чего руководитель не может"],
  "openingLine": "первая реплика сотрудника: приветствие на «вы», где работает, какие задачи, что случилось, что хочет"
}

ПРАВИЛА:
- Слои идут по возрастанию откровенности: последний самый уязвимый.
- Никаких названий компаний и продуктов.
- Живой русский язык, без канцеляризмов.`,
    },
    {
      role: "user",
      content: `Сфера: ${input.domain}
Тема переговоров: ${input.topic}
Сложность: ${input.difficulty}
Тон собеседника: ${toneLabel}
Роль собеседника: ${input.npcRole}
Должность собеседника: ${input.npcPosition}
Цель собеседника: ${input.npcGoal}`,
    },
  ];
}

/**
 * Запасной черновик. Если модель недоступна, форма всё равно работает: поля
 * заполняются из пресета и введённых значений. Демонстрация не должна падать
 * из-за внешнего API.
 */
export function fallbackDraft(input: GenerationInput): ScenarioDraft {
  const preset = input.tone === "custom" ? TONE_PRESETS.rational : TONE_PRESETS[input.tone];

  let draft = emptyDraft();
  draft = applyTonePreset(draft, input.tone);
  draft = applyDifficultyPreset(draft, input.difficulty);

  return {
    ...draft,
    title: `${input.topic}`,
    domain: input.domain,
    topic: input.topic,
    npcName: "Сотрудник",
    npcRole: input.npcRole || "Собеседник",
    npcPosition: input.npcPosition,
    npcGoal: input.npcGoal,
    context: [
      `Сфера: ${input.domain}.`,
      `Тема разговора: ${input.topic}.`,
      "Заполните контекст: что за проект, что произошло и почему разговор происходит сейчас.",
    ],
    hiddenLayers: [
      { text: "Первая, поверхностная причина. Замените на свою." },
      { text: "Более глубокая причина, о которой сотрудник скажет не сразу." },
    ],
    playerGoals: ["Выяснить настоящую причину", "Договориться о плане"],
    successCriteria: ["Выйти с планом, который сотрудник считает выполнимым"],
    resources: [...DEFAULT_RESOURCES],
    constraints: [...DEFAULT_CONSTRAINTS],
    openingLine: `Добрый день. Я по поводу того, что ${input.topic.toLowerCase()}.`,
    exitLine: preset.exitLine,
  };
}

function toDraft(input: GenerationInput, generated: Generated): ScenarioDraft {
  let draft = emptyDraft();
  draft = applyTonePreset(draft, input.tone);
  draft = applyDifficultyPreset(draft, input.difficulty);

  return {
    ...draft,
    title: generated.title,
    domain: input.domain,
    topic: input.topic,
    npcName: generated.npcName,
    npcRole: input.npcRole || "Собеседник",
    npcPosition: input.npcPosition,
    npcGoal: input.npcGoal,
    context: generated.context,
    hiddenLayers: generated.hiddenLayers.map((text) => ({ text })),
    playerGoals: generated.playerGoals,
    successCriteria: generated.successCriteria,
    resources: generated.resources,
    constraints: generated.constraints,
    openingLine: generated.openingLine,
  };
}

export interface GenerationResult {
  draft: ScenarioDraft;
  /** true, если модель не ответила и черновик собран из пресета. */
  degraded: boolean;
}

export async function generateScenarioDraft(input: GenerationInput): Promise<GenerationResult> {
  if (isMockMode()) return { draft: fallbackDraft(input), degraded: true };

  try {
    const provider = getLLMProvider();
    const raw = await provider.complete(buildPrompt(input), { schema: {}, temperature: 0.7, maxTokens: 1500 });
    // Модель иногда оборачивает JSON в тройные кавычки — вырезаем первый объект.
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = GeneratedSchema.parse(JSON.parse(match ? match[0] : raw));
    return { draft: toDraft(input, parsed), degraded: false };
  } catch (error) {
    console.error("[generate] не удалось получить черновик от модели:", error);
    return { draft: fallbackDraft(input), degraded: true };
  }
}
