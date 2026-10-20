import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isHr } from "@/lib/access";
import { assignScenario, unassignScenario } from "@/lib/org/people";

/**
 * Назначения разговоров. Организация берётся из аккаунта HR, а не из тела
 * запроса: иначе подменой поля можно было бы назначать чужим сотрудникам.
 */
async function hrGuard() {
  const user = await getCurrentUser();
  if (!user || !isHr(user.role)) {
    return { denied: NextResponse.json({ error: "forbidden" }, { status: 403 }), user: null };
  }
  if (!user.organizationId) {
    return { denied: NextResponse.json({ error: "Аккаунт не привязан к компании." }, { status: 400 }), user: null };
  }
  return { denied: null, user };
}

export async function POST(req: NextRequest) {
  const { denied, user } = await hrGuard();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : null;
  const scenarioId = typeof body?.scenarioId === "string" ? body.scenarioId : null;
  if (!userId || !scenarioId) {
    return NextResponse.json({ error: "Нужны userId и scenarioId." }, { status: 400 });
  }
  const dueAt = body?.dueAt ? new Date(body.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    return NextResponse.json({ error: "Срок указан неверно." }, { status: 400 });
  }

  const result = await assignScenario({
    organizationId: user!.organizationId!,
    assignedById: user!.id,
    userId,
    scenarioId,
    dueAt,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { denied, user } = await hrGuard();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : null;
  const scenarioId = typeof body?.scenarioId === "string" ? body.scenarioId : null;
  if (!userId || !scenarioId) {
    return NextResponse.json({ error: "Нужны userId и scenarioId." }, { status: 400 });
  }
  await unassignScenario(user!.organizationId!, userId, scenarioId);
  return NextResponse.json({ ok: true });
}
