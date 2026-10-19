import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "@/lib/scenarios/prompt";
import { cleanDraft, emptyDraft, validateDraft } from "@/lib/scenarios/draft";
import { parseScenarioFile, scenarioFileName, toScenarioFile } from "@/lib/scenarios/transfer";
import { SITUATION_PRESETS, applySituationPreset } from "@/lib/scenarios/situations";
import { checkDraftShape } from "@/lib/scenarios/shape";
import { splitContext, toPersona, toScenario } from "@/lib/scenarios/adapters";
import { hiddenPreview, playerPreview } from "@/lib/scenarios/preview";
import { TONE_PRESETS } from "@/lib/scenarios/presets";
import { GENERATION_PRESETS } from "@/lib/scenarios/generations";
import { renderPrompt } from "@/lib/scenarios/promptRender";
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
    npcBackstory: "Ты не вывозишь объём и боишься сказать об этом прямо.",
    avatar: null,
    generation: null,
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

// --- Превью сценария в конструкторе ----------------------------------------

describe("разбор контекста на ситуацию и триггер", () => {
  it("последняя строка уходит в триггер и не повторяется в описании", () => {
    const { situation, trigger } = splitContext([
      "Команда работает над проектом.",
      "Ника впервые сама решилась попросить о встрече.",
    ]);
    expect(trigger).toBe("Ника впервые сама решилась попросить о встрече.");
    expect(situation).toBe("Команда работает над проектом.");
    expect(situation).not.toContain("впервые");
  });

  it("единственная строка остаётся описанием, триггера нет", () => {
    const { situation, trigger } = splitContext(["Одна строка контекста."]);
    expect(situation).toBe("Одна строка контекста.");
    expect(trigger).toBeUndefined();
  });

  it("пустые строки не создают пустой триггер", () => {
    const { situation, trigger } = splitContext(["Ситуация.", "   ", ""]);
    expect(situation).toBe("Ситуация.");
    expect(trigger).toBeUndefined();
  });
});

describe("превью сценария", () => {
  it("не раскрывает игроку ни характер, ни скрытые интересы", () => {
    const draft = makeScenario({
      hiddenLayers: [{ text: "Боюсь не справиться и подвести команду." }],
      npcBackstory: "Ты не вывозишь объём и боишься сказать об этом прямо.",
    });
    const shown = JSON.stringify(playerPreview(draft));

    expect(shown).not.toContain("Боюсь не справиться");
    expect(shown).not.toContain("Ты не вывозишь");
    expect(shown).not.toContain("anxious");
  });

  it("считает стартовые метрики и пороги доверия так же, как движок", () => {
    const draft = makeScenario({
      hiddenLayers: [{ text: "Слой один" }, { text: "Слой два" }],
      startMetricsExact: { T: 70 },
    });
    const hidden = hiddenPreview(draft);

    // Точное число перекрывает уровень, остальные метрики берутся из уровней.
    expect(hidden.startMetrics.find((m) => m.code === "T")?.value).toBe(70);
    // Ряд порогов доверия совпадает с рядом в адаптере.
    expect(hidden.layers.map((l) => l.trustThreshold)).toEqual([40, 55]);
  });

  it("совпадает с тем, что получит движок из того же черновика", () => {
    const draft = makeScenario();
    const player = playerPreview(draft);
    const scenario = toScenario(makeScenario());
    const persona = toPersona(makeScenario());

    expect(player.situation).toBe(scenario.context);
    expect(player.trigger).toBe(persona.trigger);
    expect(player.characterNote).toBe(persona.behaviorNote);
  });
});

// --- Перенос сценария файлом -----------------------------------------------

describe("выгрузка и загрузка сценария", () => {
  it("переживает круг: содержание сценария возвращается без потерь", () => {
    // Берём именно черновик: перенос работает с ним, а не с записью в базе.
    const draft = {
      ...emptyDraft(),
      title: "Спор отделов за ресурс",
      npcName: "Марина",
      context: ["Два отдела спорят за одного разработчика.", "Запуск кампании под угрозой."],
      hiddenLayers: [{ text: "Боится не успеть к запуску." }],
      turnLimit: 12,
    };
    const raw = JSON.stringify(toScenarioFile(draft, new Date("2026-10-17T12:00:00Z")));
    const result = parseScenarioFile(raw);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft).toEqual(draft);
  });

  it("не переносит служебные поля записи: id, статус и даты", () => {
    const draft = makeScenario({ title: "Чужой сценарий" });
    const raw = JSON.stringify(toScenarioFile(draft, new Date("2026-10-17T12:00:00Z")));
    const result = parseScenarioFile(raw);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Загрузка файла не должна подменять запись, в которую её загружают,
    // иначе импорт в открытый сценарий увёл бы его идентификатор.
    for (const key of ["id", "status", "createdAt", "updatedAt"]) {
      expect(key in result.draft).toBe(false);
    }
  });

  it("недостающие поля берёт по умолчанию, а не роняет форму", () => {
    const raw = JSON.stringify({
      format: "arena-scenario",
      version: 1,
      exportedAt: "2026-10-17T12:00:00Z",
      scenario: { title: "Только название" },
    });
    const result = parseScenarioFile(raw);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.title).toBe("Только название");
      expect(result.draft.turnLimit).toBe(emptyDraft().turnLimit);
      expect(Array.isArray(result.draft.context)).toBe(true);
    }
  });

  it("отказывается от чужого файла и объясняет причину", () => {
    for (const raw of ["не json", "{}", JSON.stringify({ format: "что-то другое" })]) {
      const result = parseScenarioFile(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it("не принимает файл более новой версии формата", () => {
    const raw = JSON.stringify({ format: "arena-scenario", version: 99, scenario: {} });
    const result = parseScenarioFile(raw);
    expect(result.ok).toBe(false);
  });

  it("имя файла не содержит пробелов и расширение на месте", () => {
    expect(scenarioFileName(makeScenario({ title: "Спор отделов за ресурс" }))).toMatch(/^[^\s]+\.json$/);
    expect(scenarioFileName(makeScenario({ title: "" }))).toBe("scenario.json");
  });
});

// --- Готовые ситуации ------------------------------------------------------

describe("пресеты ситуаций", () => {
  it("каждая ситуация даёт сценарий, который проходит проверку перед публикацией", () => {
    for (const preset of SITUATION_PRESETS) {
      const draft = applySituationPreset(emptyDraft(), preset.id);
      const issues = validateDraft(cleanDraft(draft));
      expect(issues, `${preset.id}: ${issues.map((i) => i.message).join("; ")}`).toEqual([]);
    }
  });

  it("ситуация не трогает характер: его задаёт отдельный выбор тона", () => {
    const base = emptyDraft();
    const draft = applySituationPreset(base, "resource-conflict");

    expect(draft.tone).toBe(base.tone);
    expect(draft.temperament).toBe(base.temperament);
    expect(draft.characterNote).toBe(base.characterNote);
    expect(draft.reactions).toEqual(base.reactions);
  });

  it("ситуация действительно заменяет обстановку", () => {
    const draft = applySituationPreset(emptyDraft(), "resource-conflict");

    expect(draft.npcRole).toBe("Руководитель отдела маркетинга");
    expect(draft.hiddenLayers.length).toBeGreaterThanOrEqual(2);
    expect(draft.context.join(" ")).toContain("два разработчика");
  });

  it("неизвестный идентификатор оставляет черновик нетронутым", () => {
    const base = emptyDraft();
    expect(applySituationPreset(base, "нет-такой")).toEqual(base);
  });

  it("покрыты все три направления разговора", () => {
    const directions = new Set(SITUATION_PRESETS.map((p) => p.direction));
    expect([...directions].sort()).toEqual(["вбок", "вверх", "вниз"]);
  });
});

// --- Защита роутов админки от запроса не той формы -------------------------

describe("проверка формы черновика на входе в API", () => {
  it("пропускает полный черновик", () => {
    expect(checkDraftShape(emptyDraft())).toBeNull();
    expect(checkDraftShape(applySituationPreset(emptyDraft(), "handover"))).toBeNull();
  });

  it("отвергает не объект", () => {
    for (const bad of [null, undefined, "строка", 42, []]) {
      expect(checkDraftShape(bad)).not.toBeNull();
    }
  });

  it("называет недостающие поля, а не падает", () => {
    const msg = checkDraftShape({ title: "x" });
    expect(msg).toContain("нет полей");
  });

  it("ловит подмену типа у списков и чисел", () => {
    expect(checkDraftShape({ ...emptyDraft(), hiddenLayers: "не список" })).toContain("списком");
    expect(checkDraftShape({ ...emptyDraft(), turnLimit: "много" })).toContain("числом");
    expect(checkDraftShape({ ...emptyDraft(), sensitivity: NaN })).toContain("числом");
  });
});

// --- Новые характеры и поколения -------------------------------------------

describe("пресеты характеров", () => {
  it("их семь, и у каждого заполнены все поля", () => {
    const keys = Object.keys(TONE_PRESETS);
    expect(keys.length).toBe(7);

    for (const [key, p] of Object.entries(TONE_PRESETS)) {
      expect(p.label, key).toBeTruthy();
      expect(p.characterNote, key).toBeTruthy();
      expect(p.temperament.length, key).toBeGreaterThan(100);
      expect(p.triggers.length, key).toBeGreaterThanOrEqual(3);
      expect(p.soothers.length, key).toBeGreaterThanOrEqual(3);
      expect(p.exitLine, key).toBeTruthy();
      expect(p.behaviorRules.length, key).toBeGreaterThanOrEqual(6);
      expect(p.adaptiveActions.length, key).toBeGreaterThanOrEqual(3);
      expect(p.maladaptiveActions.length, key).toBeGreaterThanOrEqual(3);
      for (const lvl of ["high", "medium", "low"] as const) {
        expect(p.resistanceScale[lvl], `${key}.${lvl}`).toBeTruthy();
        expect(p.fallbackLines[lvl].length, `${key}.${lvl}`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("каждый характер двигает договорённости и пространство решений", () => {
    for (const [key, p] of Object.entries(TONE_PRESETS)) {
      const movesC = Object.values(p.reactions).some((r) => r?.C);
      const movesS = Object.values(p.reactions).some((r) => r?.S);
      expect(movesC, `${key}: ни одно действие не двигает C`).toBe(true);
      expect(movesS, `${key}: ни одно действие не двигает S`).toBe(true);
    }
  });

  it("новые характеры отличаются от старых хотя бы одной реакцией", () => {
    const base = TONE_PRESETS.rational.reactions;
    for (const key of ["manipulative", "passive_aggressive", "burnt_out", "conformist"] as const) {
      const r = TONE_PRESETS[key].reactions;
      const differs = Object.keys(r).some((a) => JSON.stringify(r[a as never]) !== JSON.stringify(base[a as never]));
      expect(differs, `${key} повторяет рационального`).toBe(true);
    }
  });
});

describe("поколения", () => {
  it("их три, и у каждого есть блок для промта", () => {
    const all = Object.values(GENERATION_PRESETS);
    expect(all.length).toBe(3);
    for (const g of all) {
      expect(g.promptBlock.length, g.id).toBeGreaterThan(150);
      expect(g.triggers.length, g.id).toBeGreaterThanOrEqual(3);
      expect(g.soothers.length, g.id).toBeGreaterThanOrEqual(3);
      expect(g.hiddenInterestHints.length, g.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("поколение попадает в промт и не ломает его отсутствием", () => {
    const template = "ТВОЙ ХАРАКТЕР:\n{{temperament}}\n{{generation}}\nДАЛЬШЕ";

    const without = renderPrompt(template, makeScenario({ generation: null }));
    expect(without).not.toContain("Поколение:");
    expect(without).toContain("ДАЛЬШЕ");

    const withGen = renderPrompt(template, makeScenario({ generation: "zoomer" }));
    expect(withGen).toContain("Поколение: зумер");
    expect(withGen).toContain("ДАЛЬШЕ");
  });

  it("поколение не показывается игроку", () => {
    const shown = JSON.stringify(playerPreview(makeScenario({ generation: "genx" })));
    expect(shown).not.toContain("Поколение");
    expect(shown).not.toContain("genx");
  });
});
