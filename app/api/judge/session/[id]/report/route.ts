import { NextRequest, NextResponse } from "next/server";
import { buildJudgeReport } from "@/lib/judge/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await buildJudgeReport(id);
  if (!report) return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  return NextResponse.json(report);
}
