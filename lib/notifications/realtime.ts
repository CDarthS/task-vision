// lib/notifications/realtime.ts — Pub/Sub Redis para notificacoes em tempo real
//
// ARQUITETURA (corrigida):
// - Publisher: singleton, reutiliza conexao principal (envia mensagens)
// - Subscriber: UNICO singleton compartilhado por todos os SSE streams
//   Cada stream registra um listener via subscribe/unsubscribe no EventEmitter
//   Quando o ultimo listener de um canal sai, o canal e removido do Redis
//
// Antes: 1 conexao IORedis por SSE stream → esgotava pool do Redis → 502
// Agora: 1 unica conexao compartilhada → O(1) conexoes independente de users
//
// Canal por usuario: tv:notify:{userId}
// Payload: { count, type, cardTitle }

import IORedis from "ioredis";
import { EventEmitter } from "events";

const CHANNEL_PREFIX = "tv:notify:";

// ─── Publisher (singleton, reutiliza a conexao principal) ────

function getPublisher(): IORedis | null {
  if (!process.env.REDIS_URL) return null;

  const globalForPub = globalThis as unknown as { redisPub: IORedis | undefined };

  if (!globalForPub.redisPub) {
    globalForPub.redisPub = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
      connectTimeout: 5000,
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

// ─── Subscriber Compartilhado (1 unica conexao para todos os SSE) ──────────

interface SharedSubscriber {
  redis: IORedis;
  emitter: EventEmitter;
  channelRefCount: Map<string, number>; // canal → quantidade de listeners
}

function getSharedSubscriber(): SharedSubscriber | null {
  if (!process.env.REDIS_URL) return null;

  const g = globalThis as unknown as { tvSharedSub: SharedSubscriber | undefined };

  if (!g.tvSharedSub) {
    const redis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
      connectTimeout: 5000,
    });

    const emitter = new EventEmitter();
    emitter.setMaxListeners(500); // Suporta ate 500 SSE streams simultaneos

    const channelRefCount = new Map<string, number>();

    // Quando o subscriber compartilhado recebe mensagem, redireciona via EventEmitter
    redis.on("message", (channel: string, message: string) => {
      emitter.emit(channel, message);
    });

    redis.on("error", (err) => {
      console.error("[SharedSub] Erro Redis:", err.message);
    });

    g.tvSharedSub = { redis, emitter, channelRefCount };
  }

  return g.tvSharedSub;
}

/**
 * Registra um listener para o canal de um usuario.
 * Retorna uma funcao de cleanup para remover o listener.
 *
 * Uso:
 *   const { channel, cleanup } = subscribeUser(userId, (message) => { ... });
 *   // ... quando terminar:
 *   cleanup();
 */
export function subscribeUser(
  userId: string,
  onMessage: (message: string) => void
): { channel: string; cleanup: () => void } | null {
  const shared = getSharedSubscriber();
  if (!shared) return null;

  const channel = `${CHANNEL_PREFIX}${userId}`;
  const { redis, emitter, channelRefCount } = shared;

  // Registra listener no EventEmitter
  emitter.on(channel, onMessage);

  // Incrementa ref count e subscreve no Redis se for o primeiro listener
  const currentCount = channelRefCount.get(channel) || 0;
  channelRefCount.set(channel, currentCount + 1);

  if (currentCount === 0) {
    // Primeiro listener para este canal — subscreve no Redis
    redis.subscribe(channel).catch((err) => {
      console.error(`[SharedSub] Falha ao subscrever ${channel}:`, err.message);
    });
  }

  // Retorna funcao de cleanup
  const cleanup = () => {
    emitter.removeListener(channel, onMessage);

    const count = channelRefCount.get(channel) || 1;
    if (count <= 1) {
      // Ultimo listener saiu — remove canal do Redis
      channelRefCount.delete(channel);
      redis.unsubscribe(channel).catch(() => {});
    } else {
      channelRefCount.set(channel, count - 1);
    }
  };

  return { channel, cleanup };
}
