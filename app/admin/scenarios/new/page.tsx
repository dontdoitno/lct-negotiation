import { Heading } from "@astryxdesign/core/Text";
import { ScenarioEditor } from "@/components/admin/ScenarioEditor";
import { emptyDraft } from "@/lib/scenarios/draft";
import { readPromptTemplate } from "@/lib/scenarios/prompt";

export const dynamic = "force-dynamic";

export default function NewScenarioPage() {
  return (
    <>
      <div className="mx-auto max-w-wide px-6 pt-6">
        <Heading level={1} type="display-3">
          Новый сценарий
        </Heading>
      </div>
      <ScenarioEditor
        scenarioId={null}
        initial={emptyDraft()}
        initialStatus="draft"
        promptTemplate={readPromptTemplate()}
      />
    </>
  );
}
