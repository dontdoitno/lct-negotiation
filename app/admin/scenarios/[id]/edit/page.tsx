import { notFound } from "next/navigation";
import { ScenarioEditor } from "@/components/admin/ScenarioEditor";
import { getScenarioDefinition } from "@/lib/scenarios/repository";
import { emptyDraft } from "@/lib/scenarios/draft";
import { readPromptTemplate } from "@/lib/scenarios/prompt";
import { ScenarioDraft } from "@/lib/scenarios/types";

export const dynamic = "force-dynamic";

export default async function EditScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scenario = await getScenarioDefinition(id);
  if (!scenario) notFound();

  // Конструктор работает с черновиком, служебные поля ему не нужны.
  // Запись накладывается на пустой черновик, причём пустые значения
  // отбрасываются: обычный спред затирает значение по умолчанию ключом,
  // у которого value равно undefined, а именно так выглядит поле, которого
  // в записи ещё нет.
  const { status } = scenario;
  const SERVICE_FIELDS = new Set(["id", "status", "playthroughCount", "createdAt", "updatedAt"]);
  const stored = Object.fromEntries(
    Object.entries(scenario).filter(([key, value]) => value !== undefined && !SERVICE_FIELDS.has(key)),
  );
  const draft: ScenarioDraft = { ...emptyDraft(), ...stored };

  return (
    <ScenarioEditor
      scenarioId={id}
      initial={draft}
      initialStatus={status}
      promptTemplate={readPromptTemplate()}
    />
  );
}
