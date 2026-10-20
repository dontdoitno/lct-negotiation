import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isHr } from "@/lib/access";
import { createMember, isPlayableRole, setMemberRole } from "@/lib/org/register";

/**
 * Сотрудники компании. Организация подставляется из аккаунта HR, из тела
 * запроса она не читается: иначе можно было бы завести человека чужой
 * компании или переписать там роль.
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
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName : null;
  if (!isPlayableRole(body?.role)) {
    return NextResponse.json({ error: "Выберите роль: сотрудник или руководитель." }, { status: 400 });
  }
  if (!email) return NextResponse.json({ error: "Введите адрес." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Пароль не короче 8 символов." }, { status: 400 });

  const result = await createMember({
    organizationId: user!.organizationId!,
    email,
    password,
    role: body.role,
    displayName,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, email: result.email });
}

export async function PATCH(req: NextRequest) {
  const { denied, user } = await hrGuard();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : null;
  if (!userId) return NextResponse.json({ error: "Нужен userId." }, { status: 400 });
  if (!isPlayableRole(body?.role)) {
    return NextResponse.json({ error: "Выберите роль: сотрудник или руководитель." }, { status: 400 });
  }

  const result = await setMemberRole(user!.organizationId!, userId, body.role);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
