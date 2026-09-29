import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Аутентификация ровно в том объёме, который нужен админскому контуру: две
 * роли и возможность войти под сид-аккаунтом. Внешнего провайдера здесь нет
 * намеренно — он добавил бы к демонстрации зависимость, которая может лечь.
 *
 * Пароль хранится как scrypt с солью в самой строке, сессия — подписанная
 * cookie. Этого достаточно для разделения ролей и не притворяется большим.
 */

const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type Role = "user" | "admin";

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  displayName: string | null;
}

// ---------------------------------------------------------------------------
// Пароли
// ---------------------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  // Сравнение постоянного времени: иначе по задержке ответа можно подбирать хеш.
  return crypto.timingSafeEqual(candidate, expected);
}

// ---------------------------------------------------------------------------
// Подпись сессии
// ---------------------------------------------------------------------------

/**
 * Секрет подписи. В продакшне задаётся переменной окружения; локально, если
 * её нет, берётся фиксированная строка — тогда сессии не переживают смену
 * окружения, но демонстрация не падает из-за незаполненной переменной.
 */
function secret(): string {
  return process.env.AUTH_SECRET || "dev-secret-not-for-production";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

function makeToken(userId: string): string {
  const payload = `${userId}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, issuedAt, signature] = parts;
  const payload = `${userId}.${issuedAt}`;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  if (Date.now() - Number(issuedAt) > SESSION_TTL_SECONDS * 1000) return null;
  return userId;
}

// ---------------------------------------------------------------------------
// Сессия
// ---------------------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<CurrentUser | null> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  const store = await cookies();
  store.set(SESSION_COOKIE, makeToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });

  return { id: user.id, email: user.email, role: user.role as Role, displayName: user.displayName };
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = readToken(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return { id: user.id, email: user.email, role: user.role as Role, displayName: user.displayName };
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}
