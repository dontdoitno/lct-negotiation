import { NextRequest, NextResponse } from "next/server";

const COOKIE = "uid";

export function proxy(req: NextRequest) {
  const existing = req.cookies.get(COOKIE)?.value;
  if (existing) return NextResponse.next();

  const res = NextResponse.next();
  res.cookies.set(COOKIE, crypto.randomUUID(), {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });
  return res;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
