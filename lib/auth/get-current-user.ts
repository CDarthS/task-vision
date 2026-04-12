import { cache } from "react";
import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import { getSessionByToken } from "./session";
import type { User } from "@/lib/generated/prisma/client";

export type SafeUser = Omit<User, "password">;

/**
 * Busca o usuario autenticado a partir dos cookies do request.
 * IMPORTANTE: Nao usar React.cache() aqui — em API Route Handlers,
 * o cache pode vazar entre requests diferentes, retornando o usuario errado.
 * Para deduplicar em Server Components (layout+page), use getCachedCurrentUser().
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("accessToken");

  if (!tokenCookie?.value) {
    return null;
  }

  const payload = verifyToken(tokenCookie.value);
  if (!payload) {
    return null;
  }

  const session = await getSessionByToken(tokenCookie.value);
  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const httpOnlyCookie = cookieStore.get("httpOnlyToken");
  if (!httpOnlyCookie?.value || httpOnlyCookie.value !== session.httpOnlyToken) {
    return null;
  }

  if (session.user.isDeactivated) {
    return null;
  }

  if (
    session.user.passwordChangedAt &&
    payload.iat < Math.floor(session.user.passwordChangedAt.getTime() / 1000)
  ) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...safeUser } = session.user;
  return safeUser;
}

/**
 * Versao cacheada de getCurrentUser() para uso EXCLUSIVO em Server Components.
 * React.cache() deduplica chamadas dentro do mesmo request de renderizacao.
 * NAO usar em API Route Handlers (app/api/*) — usar getCurrentUser() direto.
 */
export const getCachedCurrentUser = cache(getCurrentUser);

export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin(): Promise<SafeUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return user;
}
