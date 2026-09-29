import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createScenario, listScenarios } from "@/lib/scenarios/repository";
import { ScenarioDraft } from "@/lib/scenarios/types";

/** Каждый роут контура проверяет роль сам: защита макета не распространяется на API. */
async function guard() {
  return (await isAdmin()) ? null : NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json({ scenarios: await listScenarios() });
}

export async function POST(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;

  const draft = (await req.json()) as ScenarioDraft;
  try {
    const created = await createScenario(draft);
    return NextResponse.json({ scenario: created }, { status: 201 });
  } catch (error) {
    console.error("[admin] не удалось создать сценарий:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message.split("\n")[0].slice(0, 200) }, { status: 500 });
  }
}
