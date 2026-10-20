/**
 * Сиды: шесть готовых сценариев и два демонстрационных аккаунта.
 *
 * Сценарии переносятся из авторского контента в content/*.json в ту же модель,
 * которую заполняет конструктор администратора. То есть шесть исходных уровней
 * существуют как записи в БД, а не как код: их можно открыть в админке,
 * отредактировать и опубликовать заново.
 *
 * Запуск: npx tsx prisma/seed.ts
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { Persona, Scenario } from "../lib/engine/types";
import { metricLevelFromValue, reactionLevelFromValue } from "../lib/scenarios/types";
import type { ReactionMatrix, StartMetrics } from "../lib/scenarios/types";
import { emptyDraft, applyTonePreset } from "../lib/scenarios/draft";
import { applySituationPreset } from "../lib/scenarios/situations";
import { toRowData } from "../lib/scenarios/repository";
import type { Tone } from "../lib/scenarios/types";
import type { GenerationId } from "../lib/scenarios/generations";

const prisma = new PrismaClient();

const CONTENT = path.join(process.cwd(), "content");

function readJson<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(CONTENT, rel), "utf-8")) as T;
}

/** Тот же алгоритм, что в lib/auth: scrypt с солью в самой строке. */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Контекст для промта: три коротких пункта вместо одного абзаца. */
/**
 * Текст брифинга для игрока. Предысторию персонажа сюда не кладём: она
 * написана от второго лица («ты не вывозишь») и адресована ИИ-сотруднику, а
 * вдобавок выдаёт характер до первой реплики.
 */
function contextLines(scenario: Scenario, persona: Persona): string[] {
  const lines = [scenario.context];
  if (persona.trigger) lines.push(persona.trigger);
  return lines.filter(Boolean).map((l) => l.trim());
}

function toStartMetrics(persona: Persona): StartMetrics {
  return {
    R: metricLevelFromValue(persona.initialState.R),
    T: metricLevelFromValue(persona.initialState.T),
    I: metricLevelFromValue(persona.initialState.I),
    S: metricLevelFromValue(persona.initialState.S),
    C: metricLevelFromValue(persona.initialState.C),
    A: metricLevelFromValue(persona.initialState.A),
  };
}

function toReactionMatrix(persona: Persona): ReactionMatrix {
  const matrix: ReactionMatrix = {};
  for (const [action, deltas] of Object.entries(persona.reactions)) {
    const row: Record<string, string> = {};
    for (const [metric, value] of Object.entries(deltas ?? {})) {
      row[metric] = reactionLevelFromValue(value as number);
    }
    matrix[action as keyof ReactionMatrix] = row as never;
  }
  return matrix;
}

function difficultyFromScenario(scenario: Scenario): "easy" | "normal" | "hard" {
  const level = scenario.config?.difficulty ?? 3;
  if (level <= 2) return "easy";
  if (level >= 4) return "hard";
  return "normal";
}

async function seedScenarios() {
  const scenarioFiles = fs.readdirSync(path.join(CONTENT, "scenarios")).filter((f) => f.endsWith(".json"));
  const personaFiles = fs.readdirSync(path.join(CONTENT, "personas")).filter((f) => f.endsWith(".json"));

  const scenarios = scenarioFiles.map((f) => readJson<Scenario>(path.join("scenarios", f)));
  const personas = personaFiles.map((f) => readJson<Persona>(path.join("personas", f)));

  let created = 0;
  let skipped = 0;

  for (const persona of personas) {
    const scenario = scenarios.find((s) => s.id === persona.scenarioId);
    if (!scenario) {
      console.warn(`  пропущен ${persona.id}: не найден сценарий ${persona.scenarioId}`);
      continue;
    }

    // id совпадает с идентификатором уровня из файлов, поэтому уже начатые
    // сессии и прогресс продолжают ссылаться на те же записи.
    const existing = await prisma.scenarioDefinition.findUnique({ where: { id: persona.id } });
    if (existing) {
      // Уровни метрик округляют авторские числа (открытость 70 становится 85).
      // Досыпаем точные значения, не трогая остальное: сценарий мог быть
      // отредактирован администратором.
      if (existing.startMetricsExact === null) {
        await prisma.scenarioDefinition.update({
          where: { id: persona.id },
          data: { startMetricsExact: persona.initialState as never },
        });
        console.log(`  ${persona.id}: восстановлены точные стартовые метрики`);
      }
      skipped += 1;
      continue;
    }

    await prisma.scenarioDefinition.create({
      data: {
        id: persona.id,
        title: `${scenario.title}: ${persona.displayName}`,
        domain: scenario.config?.domain ?? "Управление командой",
        topic: scenario.title,
        playerRole: scenario.playerRoleDescription ?? scenario.playerRole,
        npcRole: "Сотрудник",
        direction: "down",
        context: contextLines(scenario, persona),
        npcName: persona.displayName,
        npcPosition: persona.position,
        npcBackstory: persona.backstory?.trim() || null,
        avatar: AVATAR_BY_PERSONA[persona.id] ?? null,
        tone: persona.type,
        characterNote: persona.behaviorNote ?? "",
        temperament: persona.temperament,
        triggers: persona.triggers ?? [],
        soothers: persona.soothers ?? [],
        npcGoal: persona.goal,
        initiator: scenario.initiator === "employee" ? "npc" : "player",
        openingLine: persona.openingLine,
        exitLine: persona.exitLine,
        hiddenLayers: persona.hiddenInterests.map((l) => ({ text: l.text })),
        layerRevealCost: 2,
        playerGoals: scenario.playerGoals.map((g) => g.text),
        successCriteria: scenario.successCriterion ? [scenario.successCriterion] : [],
        resources: scenario.managerResources ?? [],
        constraints: scenario.managerConstraints ?? [],
        difficultyPreset: difficultyFromScenario(scenario),
        startMetrics: toStartMetrics(persona),
        // Уровни — то, что видит администратор; точные числа сохраняют
        // авторскую настройку психолога без округления.
        startMetricsExact: persona.initialState as never,
        turnLimit: scenario.turnLimit,
        sensitivity: 1,
        trainingModeDefault: persona.type === "rational",
        reactions: toReactionMatrix(persona) as never,
        fallbackLines: persona.linesByResistance as never,
        customPrompt: null,
        status: "published",
      },
    });
    created += 1;
  }

  console.log(`  сценарии: создано ${created}, уже было ${skipped}`);
}

/**
 * Демонстрационная компания и три аккаунта, по одному на роль.
 *
 * Компания обязательна: всё, что видит HR, ограничено её рамками, и аккаунт
 * без организации получает вместо списка людей и аналитики заглушку. Роли
 * здесь те же три строки, что принимает `isRole` в `lib/access.ts`. Пока
 * сиды писали `admin` и `user`, на чистой машине администратор молча
 * становился рядовым сотрудником и в админку не попадал.
 */
const DEMO_ORG = { name: "Демо-компания", joinCode: "ARENA-DEMO" };

async function seedUsers() {
  const org = await prisma.organization.upsert({
    where: { joinCode: DEMO_ORG.joinCode },
    update: {},
    create: DEMO_ORG,
  });
  console.log(`  компания ${org.name}: код ${org.joinCode}`);

  const accounts = [
    {
      email: "admin@razbor.local",
      password: "admin12345",
      role: "hr",
      displayName: "Администратор",
    },
    {
      email: "manager@razbor.local",
      password: "manager12345",
      role: "manager",
      displayName: "Руководитель",
    },
    {
      email: "user@razbor.local",
      password: "user12345",
      role: "employee",
      displayName: "Сотрудник",
    },
  ];

  for (const account of accounts) {
    const existing = await prisma.user.findUnique({ where: { email: account.email } });
    if (existing) {
      // Аккаунт мог остаться от сидов с прежними ролями `admin` и `user`
      // или от времён до появления компаний. Чиним роль и привязку, пароль и
      // прогресс не трогаем.
      const fixes: { role?: string; organizationId?: string; displayName?: string } = {};
      if (existing.role !== account.role) fixes.role = account.role;
      if (!existing.organizationId) fixes.organizationId = org.id;
      // Подпись демо-аккаунта правим тоже: сотрудник, подписанный
      // «Руководитель», сбивает с толку на показе.
      if (existing.displayName !== account.displayName) fixes.displayName = account.displayName;
      if (Object.keys(fixes).length > 0) {
        await prisma.user.update({ where: { id: existing.id }, data: fixes });
        console.log(`  аккаунт ${account.email}: поправлен (${Object.keys(fixes).join(", ")})`);
      } else {
        console.log(`  аккаунт ${account.email}: уже есть`);
      }
      continue;
    }
    await prisma.user.create({
      data: {
        email: account.email,
        passwordHash: hashPassword(account.password),
        role: account.role,
        displayName: account.displayName,
        organizationId: org.id,
      },
    });
    console.log(`  аккаунт ${account.email}: создан, роль ${account.role}`);
  }
}

/**
 * Какой аватар достаётся какому персонажу.
 *
 * Первое правило — пол лица должен совпадать с именем персонажа. Второе —
 * связь с характером разорвана: если бы у тревожного всегда было одно лицо,
 * участник узнавал бы характер по внешности ещё до первой реплики, а определить
 * его по поведению это половина задачи. Поэтому одно лицо достаётся разным
 * характерам.
 *
 * Полностью развести не выходит: мужское лицо среди трёх всего одно, а женских
 * персонажей три при двух женских лицах. Чтобы связка окончательно перестала
 * читаться, аватаров нужно больше.
 */
const AVATAR_BY_PERSONA: Record<string, string> = {
  // Мужские персонажи: аватар с мужским лицом только один.
  "s1-rational": "avatar-2", // Дмитрий
  "s1-aggressive": "avatar-2", // Артём
  "s3-aggressive": "avatar-2", // Игорь
  // Женские персонажи.
  "s1-anxious": "avatar-1", // Ника
  "s3-rational": "avatar-1", // Марина
  "s3-anxious": "avatar-3", // Ольга
};

/**
 * Сценарии, собранные из заготовок конструктора.
 *
 * Шесть исходных приходят из файлов `content/`, эти девять из
 * `SITUATION_PRESETS`: ситуация плюс первый рекомендованный характер из
 * `inner_docs/SCENARIOUS.md`. Без этого на чистой машине каталог
 * ограничивался бы шестью разговорами.
 *
 * Поколения в исходных документах по сценариям не заданы, значения здесь
 * подобраны так, чтобы ось была видна и различалась внутри одной темы.
 */
const FROM_PRESETS: {
  id: string;
  preset: string;
  tone: Tone;
  generation: GenerationId;
  avatar: string | null;
}[] = [
  { id: "s1-3", preset: "s1-3", tone: "rational", generation: "millennial", avatar: "avatar-2" },
  { id: "s2-1", preset: "s2-1", tone: "rational", generation: "genx", avatar: "avatar-2" },
  { id: "s2-2", preset: "s2-2", tone: "manipulative", generation: "zoomer", avatar: "avatar-1" },
  { id: "s2-3", preset: "s2-3", tone: "aggressive", generation: "millennial", avatar: "avatar-2" },
  { id: "s3-1", preset: "s3-1", tone: "rational", generation: "genx", avatar: "avatar-3" },
  { id: "s3-2", preset: "s3-2", tone: "anxious", generation: "zoomer", avatar: "avatar-2" },
  { id: "s3-3", preset: "s3-3", tone: "rational", generation: "millennial", avatar: "avatar-2" },
  { id: "s5-1", preset: "s5-1", tone: "rational", generation: "genx", avatar: "avatar-2" },
  { id: "s5-2", preset: "s5-2", tone: "manipulative", generation: "millennial", avatar: "avatar-1" },
];

async function seedFromPresets() {
  for (const item of FROM_PRESETS) {
    const existing = await prisma.scenarioDefinition.findUnique({ where: { id: item.id } });
    if (existing) {
      console.log(`  ${item.id}: уже есть`);
      continue;
    }
    let draft = applySituationPreset(emptyDraft(), item.preset);
    draft = applyTonePreset(draft, item.tone);
    draft.generation = item.generation;
    draft.avatar = item.avatar as typeof draft.avatar;

    // toRowData объявлен с приведением к never ради типов Prisma для Json,
    // поэтому здесь возвращаем его к объекту, чтобы разложить в data.
    const row = toRowData(draft) as unknown as Record<string, unknown>;
    await prisma.scenarioDefinition.create({
      data: { id: item.id, ...row, status: "published" } as never,
    });
    console.log(`  ${item.id}: создан — ${draft.title}`);
  }
}

async function main() {
  console.log("Сиды:");
  await seedScenarios();
  await seedFromPresets();
  await seedUsers();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
