import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { isPlayableRole, registerAccount } from "@/lib/org/register";

/**
 * Самостоятельная регистрация. Роль человек выбирает сам, но только из двух
 * игровых: HR заводится отдельно, вместе с компанией.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = isPlayableRole(body?.role) ? body.role : "employee";
  const joinCode = typeof body?.joinCode === "string" ? body.joinCode : null;
  const displayName = typeof body?.displayName === "string" ? body.displayName : null;

  if (!email || !password) return NextResponse.json({ error: "Введите адрес и пароль." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Минимум 8 символов." }, { status: 400 });

  const result = await registerAccount({ email, password, role, joinCode, displayName });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // Сразу входим: иначе человек после регистрации попадает на форму входа.
  const user = await signIn(result.email, result.password);
  return NextResponse.json({ role: user?.role ?? role });
}
