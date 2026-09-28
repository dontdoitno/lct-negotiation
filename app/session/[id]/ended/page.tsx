import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPersona, getScenario } from "@/lib/content/loader";
import { SessionState } from "@/lib/engine/types";
import { EndReason } from "@/lib/flow/types";
import { EndedView } from "@/components/session/EndedView";

export default async function SessionEndedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) redirect("/cases");

  // This screen exists only for conversations that broke off. A session that
  // reached agreement was not interrupted, so it belongs straight in the
  // debrief — otherwise a success would be greeted with "он сорвался".
  if (session.status === "success") redirect(`/session/${id}/debrief`);

  const persona = getPersona(session.personaId);
  const scenario = getScenario(session.scenarioId);
  const state = session.state as unknown as SessionState;

  const endReason: EndReason =
    session.status === "failed" ? "ai_left" : state.turn >= scenario.turnLimit ? "turn_limit" : "ai_left";

  return (
    <div className="min-h-screen bg-surface text-primary">
      <EndedView sessionId={id} endReason={endReason} personaType={persona.type} />
    </div>
  );
}
