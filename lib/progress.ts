import { prisma } from "./db";
import { listLevels } from "./content/loader";

export interface LevelCard {
  levelId: string;
  scenarioId: string;
  scenarioTitle: string;
  displayName: string;
  position: string;
  typeLabel: string;
  type: "rational" | "anxious" | "aggressive";
  bestStars: number;
  attempts: number;
  unlocked: boolean;
}

// Onboarding order within a scenario: rational teaches the mechanic first,
// anxious teaches reading the unsaid, aggressive demands holding ground.
const TYPE_RANK: Record<LevelCard["type"], number> = { rational: 0, anxious: 1, aggressive: 2 };

export async function getLevelMap(userId: string): Promise<LevelCard[]> {
  const levels = listLevels();
  const progressRows = await prisma.progress.findMany({ where: { userId } });
  const progressByLevel = new Map(progressRows.map((p) => [p.levelId, p]));

  const byScenario = new Map<string, typeof levels>();
  for (const level of levels) {
    const arr = byScenario.get(level.scenario.id) ?? [];
    arr.push(level);
    byScenario.set(level.scenario.id, arr);
  }

  const cards: LevelCard[] = [];
  for (const [, levelsInScenario] of byScenario) {
    const sorted = [...levelsInScenario].sort((a, b) => TYPE_RANK[a.persona.type] - TYPE_RANK[b.persona.type]);
    sorted.forEach((level, i) => {
      const prevStars = i === 0 ? null : progressByLevel.get(sorted[i - 1].persona.id)?.bestStars ?? 0;
      const unlocked = i === 0 ? true : (prevStars ?? 0) >= 2;
      const progress = progressByLevel.get(level.persona.id);
      cards.push({
        levelId: level.persona.id,
        scenarioId: level.scenario.id,
        scenarioTitle: level.scenario.title,
        displayName: level.persona.displayName,
        position: level.persona.position,
        typeLabel: level.persona.typeLabel,
        type: level.persona.type,
        bestStars: progress?.bestStars ?? 0,
        attempts: progress?.attempts ?? 0,
        unlocked,
      });
    });
  }
  return cards;
}
