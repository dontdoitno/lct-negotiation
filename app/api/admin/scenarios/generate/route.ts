import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { generateScenarioDraft, GenerationInput } from "@/lib/scenarios/generate";
import { createScenario } from "@/lib/scenarios/repository";
import { cleanDraft } from "@/lib/scenarios/draft";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const input = (await req.json()) as GenerationInput;
  if (!input.domain?.trim() || !input.topic?.trim()) {
    return NextResponse.json({ error: "empty_input" }, { status: 400 });
  }

  const { draft, degraded } = await generateScenarioDraft(input);
  // Черновик сразу сохраняется: админ попадает в конструктор по адресу
  // существующей записи, и результат генерации не теряется при перезагрузке.
  const scenario = await createScenario(cleanDraft(draft));

  return NextResponse.json({ id: scenario.id, degraded }, { status: 201 });
}
