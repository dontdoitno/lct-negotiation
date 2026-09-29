import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  deleteScenario,
  getScenarioDefinition,
  setScenarioStatus,
  updateScenario,
} from "@/lib/scenarios/repository";
import { ScenarioDraft, ScenarioStatus } from "@/lib/scenarios/types";

async function guard() {
  return (await isAdmin()) ? null : NextResponse.json({ error: "forbidden" }, { status: 403 });
}

/** Короткая причина для интерфейса. Стек и детали остаются в логах сервера. */
function readableError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Unknown argument")) {
    return "схема базы и код разошлись. Перезапустите сервер разработки: клиент Prisma устарел.";
  }
  return message.split("\n")[0].slice(0, 200);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;

  const { id } = await params;
  const scenario = await getScenarioDefinition(id);
  if (!scenario) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ scenario });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;

  const { id } = await params;
  const draft = (await req.json()) as ScenarioDraft;
  try {
    return NextResponse.json({ scenario: await updateScenario(id, draft) });
  } catch (error) {
    // Без этого клиент получает пустой 500 и показывает «не сохранилось»
    // без причины. Текст ошибки нужен администратору, а не только в логах.
    console.error("[admin] не удалось сохранить сценарий:", error);
    return NextResponse.json({ error: readableError(error) }, { status: 500 });
  }
}

/** Смена статуса отдельным методом: публикация не должна требовать всей формы. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.status as ScenarioStatus;
  if (status !== "draft" && status !== "published") {
    return NextResponse.json({ error: "bad_status" }, { status: 400 });
  }
  return NextResponse.json({ scenario: await setScenarioStatus(id, status) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;

  const { id } = await params;
  await deleteScenario(id);
  return NextResponse.json({ ok: true });
}
