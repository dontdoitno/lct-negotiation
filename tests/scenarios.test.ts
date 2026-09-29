import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "@/lib/scenarios/prompt";
import { cleanDraft, validateDraft } from "@/lib/scenarios/draft";
import { toPersona, toScenario } from "@/lib/scenarios/adapters";
import { TONE_PRESETS } from "@/lib/scenarios/presets";
import { ScenarioDefinition } from "@/lib/scenarios/types";
import { applyTurn, createInitialState } from "@/lib/engine/state";

/** Минимальный сценарий на пресете тона — то, что отдаёт конструктор. */
function makeScenario(overrides: Partial<ScenarioDefinition> = {}): ScenarioDefinition {
  const preset = TONE_PRESETS.anxious;
  return {
    id: "test-1",
    title: "Тестовый разговор",
    domain: "Управление командой",
    topic: "Перегрузка сотрудника",
    playerRole: "Руководитель отдела",
    npcRole: "Сотрудник",
    context: ["Проект идёт, сроки согласованы.", "Коллега на больничном."],
    npcName: "Ника",
    npcPosition: "Middle-разработчик",
    tone: "anxious",
    characterNote: preset.characterNote,
    temperament: preset.temperament,
    triggers: preset.triggers,
    soothers: preset.soothers,
    npcGoal: "Снизить нагрузку, но не говорить об этом прямо.",
    initiator: "npc",
    openingLine: "Извините, можно вас на минуту?",
    exitLine: preset.exitLine,
    hiddenLayers: [{ text: "Я не успеваю." }, { text: "Боюсь, что сочтут слабой." }],
    layerRevealCost: 2,
    playerGoals: ["Сохранить сроки", "Не потерять сотрудника"],
    successCriteria: ["Выйти с реалистичным планом"],
    resources: ["перераспределить задачи"],
    constraints: ["мгновенно повысить зарплату"],
    difficultyPreset: "normal",
    startMetrics: preset.startMetrics,
    turnLimit: 14,
    sensitivity: 1,
    showTypeInBrief: false,
    trainingModeDefault: false,
    reactions: preset.reactions,
    fallbackLines: preset.fallbackLines,
    customPrompt: null,
    status: "draft",
    playthroughCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildSystemPrompt", () => {
  it("детерминирован: один сценарий всегда даёт один и тот же текст", () => {
    const scenario = makeScenario();
    expect(buildSystemPrompt(scenario)).toBe(buildSystemPrompt(scenario));
  });

  it("не оставляет незаполненных слотов", () => {
    const prompt = buildSystemPrompt(makeScenario());
    expect(prompt.match(/\{\{\w+\}\}/g)).toBeNull();
  });

  it("подставляет поля сценария, а не значения пресета", () => {
    const prompt = buildSystemPrompt(makeScenario({ npcName: "Валентина", topic: "Падение результатов" }));
    expect(prompt).toContain("Валентина");
    expect(prompt).toContain("Падение результатов");
  });

  it("выводит слои интересов по порядку и цену раскрытия", () => {
    const prompt = buildSystemPrompt(makeScenario({ layerRevealCost: 3 }));
    expect(prompt).toContain("Слой 1: «Я не успеваю.»");
    expect(prompt).toContain("Слой 2: «Боюсь, что сочтут слабой.»");
    expect(prompt).toContain("по одному слою за 3 правильных действия");
  });

  it("ручной промт полностью заменяет собранный", () => {
    const scenario = makeScenario({ customPrompt: "Только эта строка." });
    expect(buildSystemPrompt(scenario)).toBe("Только эта строка.");
  });
});

describe("сценарий в типы движка", () => {
  it("уровни метрик становятся числами", () => {
    const persona = toPersona(makeScenario());
    // тревожный пресет стартует со средних сопротивления и открытости
    expect(persona.initialState.R).toBe(50);
    expect(persona.initialState.T).toBe(50);
  });

  it("чувствительность масштабирует дельты", () => {
    const weak = toPersona(makeScenario({ sensitivity: 0.5 }));
    const strong = toPersona(makeScenario({ sensitivity: 2 }));
    expect(Math.abs(strong.reactions.ack_emotion!.R!)).toBeGreaterThan(
      Math.abs(weak.reactions.ack_emotion!.R!),
    );
  });

  it("ненулевое влияние не схлопывается в ноль на низкой чувствительности", () => {
    const persona = toPersona(makeScenario({ sensitivity: 0.01 }));
    for (const delta of Object.values(persona.reactions)) {
      for (const value of Object.values(delta ?? {})) {
        expect(value).not.toBe(0);
      }
    }
  });

  it("цена раскрытия слоя доезжает до движка", () => {
    const persona = toPersona(makeScenario({ layerRevealCost: 3 }));
    let state = createInitialState(persona);
    // Двух конструктивных действий теперь недостаточно.
    state = applyTurn(state, ["ack_emotion"], persona).state;
    const second = applyTurn(state, ["ack_emotion"], persona);
    expect(second.revealed).toBeNull();
    const third = applyTurn(second.state, ["ack_emotion"], persona);
    expect(third.revealed?.layer).toBe(1);
  });

  it("цели игрока получают метрики и пороги", () => {
    const scenario = toScenario(makeScenario());
    expect(scenario.playerGoals).toHaveLength(2);
    expect(scenario.playerGoals[0].metric).toBe("C");
    expect(scenario.playerGoals[1].direction).toBe("below");
  });
});

describe("валидация черновика", () => {
  it("не падает на записи, сохранённой до появления поля", () => {
    // Такой объект приходит из старой записи или из формы, открытой до
    // деплоя: поля просто нет. Редактор от этого падать не должен.
    const legacy = makeScenario();
    delete (legacy as Partial<ScenarioDefinition>).npcRole;

    expect(() => validateDraft(legacy)).not.toThrow();
    expect(validateDraft(legacy).map((i) => i.message)).toContain("Не заполнена роль ИИ");
  });

  it("чистка черновика тоже переживает отсутствующие списки", () => {
    const legacy = makeScenario();
    delete (legacy as Partial<ScenarioDefinition>).hiddenLayers;
    delete (legacy as Partial<ScenarioDefinition>).resources;

    expect(() => cleanDraft(legacy)).not.toThrow();
    expect(cleanDraft(legacy).hiddenLayers).toEqual([]);
  });

  it("полностью заполненный черновик проходит проверку", () => {
    expect(validateDraft(makeScenario())).toEqual([]);
  });
});
