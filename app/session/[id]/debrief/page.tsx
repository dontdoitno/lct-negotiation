import { redirect } from "next/navigation";
import { loadDebrief } from "@/lib/flow/debrief";
import { DebriefView } from "@/components/debrief/DebriefView";

export default async function SessionDebriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadDebrief(id);
  // Route guard from the spec: a debrief without a session goes back to cases.
  if (!data) redirect("/cases");

  return (
    <div className="min-h-screen bg-surface text-primary">
      <DebriefView data={data} />
    </div>
  );
}
