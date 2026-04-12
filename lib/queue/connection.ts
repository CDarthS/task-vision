// lib/queue/connection.ts — Configuracao compartilhada para BullMQ
//
// BullMQ requer uma conexao IORedis com maxRetriesPerRequest: null.
// Este modulo exporta a ConnectionOptions e o cliente redis compartilhado
// para que todas as filas e workers usem a mesma conexao.

import { redis } from "@/lib/redis";

// Re-exporta a conexao Redis para uso nas filas e workers do BullMQ.
// BullMQ aceita uma instancia IORedis diretamente.
export const redisConnection = redis;

// Prefixo para todas as filas do Task Vision
// Facilita identificar filas no Redis e evita colisao com outros servicos
export const QUEUE_PREFIX = "tv";
