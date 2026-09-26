import { cookies } from "next/headers";

export async function getUserId(): Promise<string> {
  const store = await cookies();
  const uid = store.get("uid")?.value;
  // middleware.ts guarantees the cookie exists on every real request; this
  // fallback only matters for tooling that bypasses middleware (tests, RSC prerender).
  return uid ?? "anonymous";
}
