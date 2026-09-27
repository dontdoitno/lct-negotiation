import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/user";
import { createJudgeSession } from "@/lib/judge/session";
import { PersonaType } from "@/lib/judge/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { scenario_id, persona } = body as { scenario_id?: string; persona?: PersonaType };

  if (!scenario_id || !persona) {
    return NextResponse.json({ error: "scenario_id and persona are required" }, { status: 400 });
  }
  if (!["rational", "anxious", "aggressive"].includes(persona)) {
    return NextResponse.json({ error: "persona must be rational | anxious | aggressive" }, { status: 400 });
  }

  const userId = await getUserId();

  try {
    const result = await createJudgeSession(userId, scenario_id, persona);
    return NextResponse.json({
      session_id: result.sessionId,
      metrics: result.metrics,
      reply: result.openingLine,
      scenario: result.scenario,
      persona: result.persona,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to create session" }, { status: 400 });
  }
}
