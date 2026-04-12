// lib/notifications/realtime.ts — Pub/Sub Redis para notificacoes em tempo real
//
// Pub/Sub requer 2 conexoes Redis separadas:
// - publisher: envia mensagens (usado pelos workers)
// - subscriber: recebe mensagens (usado pelo endpoint SSE)
//
// Canal por usuario: tv:notify:{userId}
// Payload: { count, type, cardTitle }

import IORedis from "ioredis";

const CHANNEL_PREFIX = "tv:notify:";

// ─── Publisher (singleton, reutiliza a conexao principal) ────

function getPublisher(): IORedis | null {
  if (!process.env.REDIS_URL) return null;

  const globalForPub = globalThis as unknown as { redisPub: IORedis | undefined };

  if (!globalForPub.redisPub) {
    globalForPub.redisPub = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
  }

  return globalForPub.redisPub;
}

/**
 * Publica uma notificacao no canal do usuario.
 * Chamado pelos workers apos criar notificacoes no banco.
 */
export async function publishNotification(
  userId: string,
  payload: { count?: number; type?: string; cardTitle?: string }
) {
  const pub = getPublisher();
  if (!pub) return;

  try {
    await pub.publish(
      `${CHANNEL_PREFIX}${userId}`,
      JSON.stringify(payload)
    );
  } catch {
    // Silencioso — pub/sub e best-effort
  }
}

/**
 * Publica para multiplos usuarios de uma vez.
 */
export async function publishNotificationBatch(
  userIds: string[],
  payload: { type?: string; cardTitle?: string }
) {
  const pub = getPublisher();
  if (!pub || userIds.length === 0) return;

  try {
    const pipeline = pub.pipeline();
    for (const userId of userIds) {
      pipeline.publish(
        `${CHANNEL_PREFIX}${userId}`,
        JSON.stringify(payload)
      );
    }
    await pipeline.exec();
  } catch {
    // Silencioso
  }
}

// ─── Subscriber (cria conexao dedicada por stream) ──────────

/**
 * Cria um subscriber dedicado para um usuario.
 * Retorna o subscriber IORedis e o nome do canal.
 * O chamador e responsavel por fazer .unsubscribe() e .quit() ao fechar.
 */
export function createUserSubscriber(userId: string): {
  subscriber: IORedis;
  channel: string;
} | null {
  if (!process.env.REDIS_URL) return null;

  const subscriber = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: false,
  });

  const channel = `${CHANNEL_PREFIX}${userId}`;

  return { subscriber, channel };
}
