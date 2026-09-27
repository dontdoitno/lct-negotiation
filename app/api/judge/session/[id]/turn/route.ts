import { NextRequest, NextResponse } from "next/server";
import { processJudgeTurn } from "@/lib/judge/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const text: string = (body.text ?? "").toString();

  try {
    const result = await processJudgeTurn(id, text);
    return NextResponse.json({
      reply: result.reply,
      metrics: result.metrics,
      deltas: result.deltas,
      techniques_used: result.techniquesUsed,
      techniques_violated: result.techniquesViolated,
      turn: result.turn,
      finished: result.finished,
      status: result.status,
      degraded: result.degraded,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "turn_failed";
    const status = message === "session_not_found" ? 404 : message === "session_finished" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
