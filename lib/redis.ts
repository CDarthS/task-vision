// lib/redis.ts — Singleton do IORedis para conexao com Redis
//
// Usa o padrao globalThis para evitar multiplas conexoes durante
// hot reload em desenvolvimento (mesmo pattern do lib/prisma.ts).
//
// Em producao (Railway), usa REDIS_URL apontando para redis.railway.internal.

import IORedis from "ioredis";

function createRedisClient(): IORedis {
  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error(
      "[Redis] REDIS_URL nao definida. Configure no .env ou Railway."
    );
  }

  const client = new IORedis(url, {
    maxRetriesPerRequest: null, // Exigido pelo BullMQ
    enableReadyCheck: true,
    retryStrategy(times) {
      // Retry com backoff exponencial, max 10s
      const delay = Math.min(times * 200, 10000);
      console.log(`[Redis] Reconectando em ${delay}ms (tentativa ${times})...`);
      return delay;
    },
    lazyConnect: false,
  });

  client.on("connect", () => {
    console.log("[Redis] Conectado com sucesso.");
  });

  client.on("error", (err) => {
    console.error("[Redis] Erro de conexao:", err.message);
  });

  return client;
}

const globalForRedis = globalThis as unknown as {
  redis: IORedis | undefined;
};

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
