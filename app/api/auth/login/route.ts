import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "empty_credentials" }, { status: 400 });
  }

  const user = await signIn(email, password);
  // Одна и та же ошибка на «нет такого адреса» и «неверный пароль»: иначе
  // форма входа превращается в способ узнать, кто зарегистрирован.
  if (!user) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

  return NextResponse.json({ role: user.role, displayName: user.displayName });
}
