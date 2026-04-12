// lib/notifications/cache.ts — Cache Redis para contagem de notificacoes
//
// Evita queries repetidas ao banco (antes: 1 query a cada 30s por user).
// Agora: leitura do Redis (sub-ms), query Prisma apenas no cache miss.
//
// Chave:   tv:notif-count:{userId}
// Valor:   numero (string no Redis)
// TTL:     30 segundos

import { redis } from "@/lib/redis";

const PREFIX = "tv:notif-count:";
const TTL_SECONDS = 30;

/**
 * Busca a contagem de notificacoes nao-lidas do cache Redis.
 * Retorna null se nao estiver no cache (cache miss).
 */
export async function getCachedCount(userId: string): Promise<number | null> {
  try {
    const cached = await redis.get(`${PREFIX}${userId}`);
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
    await redis.set(`${PREFIX}${userId}`, count.toString(), "EX", TTL_SECONDS);
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
    await redis.del(`${PREFIX}${userId}`);
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
    await redis.del(...keys);
  } catch {
    // Silencioso
  }
}
