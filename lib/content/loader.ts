import fs from "node:fs";
import path from "node:path";
import { Persona, Scenario } from "../engine/types";

const CONTENT_ROOT = path.join(process.cwd(), "content");

function readJson<T>(relPath: string): T {
  const full = path.join(CONTENT_ROOT, relPath);
  const raw = fs.readFileSync(full, "utf-8");
  return JSON.parse(raw) as T;
}

export function listScenarios(): Scenario[] {
  const dir = path.join(CONTENT_ROOT, "scenarios");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<Scenario>(path.join("scenarios", f)));
}

export function getScenario(id: string): Scenario {
  const scenario = listScenarios().find((s) => s.id === id);
  if (!scenario) throw new Error(`Scenario not found: ${id}`);
  return scenario;
}

export function listPersonas(): Persona[] {
  const dir = path.join(CONTENT_ROOT, "personas");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<Persona>(path.join("personas", f)));
}

export function getPersona(id: string): Persona {
  const persona = listPersonas().find((p) => p.id === id);
  if (!persona) throw new Error(`Persona not found: ${id}`);
  return persona;
}

export interface Level {
  levelId: string; // persona id, used as the level key
  scenario: Scenario;
  persona: Persona;
  order: number;
}

// Fixed onboarding order: rational -> anxious -> aggressive, per the spec's
// pedagogical progression (learn the mechanic -> read the unsaid -> hold
// your ground under pressure).
const TYPE_ORDER: Record<Persona["type"], number> = { rational: 0, anxious: 1, aggressive: 2 };

export function listLevels(): Level[] {
  const scenarios = listScenarios();
  const personas = listPersonas();
  const levels: Level[] = [];
  scenarios.forEach((scenario, scenarioIndex) => {
    for (const personaId of scenario.personas) {
      const persona = personas.find((p) => p.id === personaId);
      if (!persona) continue;
      levels.push({
        levelId: persona.id,
        scenario,
        persona,
        order: scenarioIndex * 10 + TYPE_ORDER[persona.type],
      });
    }
  });
  return levels.sort((a, b) => a.order - b.order);
}
