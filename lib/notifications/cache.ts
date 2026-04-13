// lib/notifications/cache.ts — Cache Redis para contagem de notificacoes
//
// Evita queries repetidas ao banco (antes: 1 query a cada 30s por user).
// Agora: leitura do Redis (sub-ms), query Prisma apenas no cache miss.
//
// IMPORTANTE: Todas as operacoes tem timeout de 3s para fail-fast.
// Se Redis estiver lento/travado, retorna null (cache miss) em vez de
// esperar 15s e causar 502.
//
// Chave:   tv:notif-count:{userId}
// Valor:   numero (string no Redis)
// TTL:     30 segundos

import { redis } from "@/lib/redis";

const PREFIX = "tv:notif-count:";
const TTL_SECONDS = 30;
const REDIS_TIMEOUT_MS = 3000; // Timeout de 3s para operacoes Redis

/**
 * Wrapper que adiciona timeout a uma operacao Redis.
 * Se Redis nao responder em REDIS_TIMEOUT_MS, retorna null.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  fallback: T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) =>
      setTimeout(() => resolve(fallback), REDIS_TIMEOUT_MS)
    ),
  ]);
}

/**
 * Busca a contagem de notificacoes nao-lidas do cache Redis.
 * Retorna null se nao estiver no cache (cache miss) ou se Redis estiver lento.
 */
export async function getCachedCount(userId: string): Promise<number | null> {
  try {
    const cached = await withTimeout(
      redis.get(`${PREFIX}${userId}`),
      null
    );
    return cached !== null ? parseInt(cached, 10) : null;
  } catch {
    // Se Redis falhar, retorna null (fallback para query direta)
    return null;
  }
}

/**
 * Salva a contagem de notificacoes no cache Redis com TTL.
 */
export async function setCachedCount(userId: string, count: number): Promise<void> {
  try {
    await withTimeout(
      redis.set(`${PREFIX}${userId}`, count.toString(), "EX", TTL_SECONDS),
      null
    );
  } catch {
    // Se Redis falhar, ignora silenciosamente (a query direta continua funcionando)
  }
}

/**
 * Invalida o cache de contagem de um usuario.
 * Chamar apos criar notificacao ou marcar como lida.
 */
export async function invalidateCount(userId: string): Promise<void> {
  try {
    await withTimeout(redis.del(`${PREFIX}${userId}`), 0);
  } catch {
    // Silencioso
  }
}

/**
 * Invalida o cache de contagem de multiplos usuarios.
 * Util apos criar notificacoes em batch (notifyCardMembers).
 */
export async function invalidateCountBatch(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  try {
    const keys = userIds.map((id) => `${PREFIX}${id}`);
    await withTimeout(redis.del(...keys), 0);
  } catch {
    // Silencioso
  }
}
