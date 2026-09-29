import Link from "next/link";
import { Heading } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { listScenarios } from "@/lib/scenarios/repository";
import { ScenarioTable } from "@/components/admin/ScenarioTable";
import { ADMIN } from "@/lib/flow/copy";

export const dynamic = "force-dynamic";

export default async function AdminScenariosPage() {
  const scenarios = await listScenarios();

  return (
    <main className="mx-auto max-w-wide px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={1} type="display-3">
          {ADMIN.listTitle}
        </Heading>
        <div className="flex gap-2">
          <Link href="/admin/scenarios/generate">
            <Button variant="secondary" label={ADMIN.generate} />
          </Link>
          <Link href="/admin/scenarios/new">
            <Button variant="primary" label={ADMIN.create} />
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <ScenarioTable scenarios={scenarios} />
      </div>
    </main>
  );
}
