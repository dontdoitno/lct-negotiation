import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";

/**
 * Под кем идёт игра.
 *
 * У вошедшего это идентификатор аккаунта: к нему привязаны назначения от HR и
 * по нему же HR видит прогресс. У гостя остаётся анонимная cookie `uid`.
 *
 * Раньше здесь всегда возвращалась cookie, и у вошедшего она не совпадала с
 * его аккаунтом. Сессии копились под случайным идентификатором, поэтому ни
 * назначения, ни прогресс к человеку не привязывались.
 */
export async function getUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (user) return user.id;

  const store = await cookies();
  const uid = store.get("uid")?.value;
  // proxy.ts проставляет cookie на каждом реальном запросе; запасной вариант
  // нужен только инструментам в обход прокси (тесты, пререндер RSC).
  return uid ?? "anonymous";
}
