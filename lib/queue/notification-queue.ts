// lib/queue/notification-queue.ts — Fila para despacho assincrono de notificacoes
//
// Segundo caso de uso do BullMQ no Task Vision.
// Tira o peso das API Routes: em vez de buscar membros + criar notificacoes
// sincronamente (bloqueando a resposta), as APIs enfileiram e retornam rapido.
//
// Tipos de jobs:
// - "notify-single": cria 1 notificacao para 1 usuario
// - "notify-card-members": busca membros/watchers do card e cria notificacoes em batch

import { Queue } from "bullmq";
import { redisConnection, QUEUE_PREFIX } from "./connection";

export const NOTIFICATION_QUEUE_NAME = "notification-dispatch";

// Job para notificar 1 usuario especifico
export interface NotifySingleJobData {
  kind: "notify-single";
  userId: string;
  creatorId?: string;
  cardId: string;
  boardId: string;
  commentId?: string;
  type: string;
  data?: Record<string, string>;
}

// Job para notificar todos os membros/watchers de um card
export interface NotifyCardMembersJobData {
  kind: "notify-card-members";
  excludeUserId: string;
  cardId: string;
  boardId: string;
  type: string;
  data?: Record<string, string>;
  commentId?: string;
}

export type NotificationJobData = NotifySingleJobData | NotifyCardMembersJobData;

// Singleton da fila
const globalForQueue = globalThis as unknown as {
  notificationQueue: Queue<NotificationJobData> | undefined;
};

function createNotificationQueue(): Queue<NotificationJobData> {
  return new Queue<NotificationJobData>(NOTIFICATION_QUEUE_NAME, {
    connection: redisConnection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: {
      removeOnComplete: {
        age: 3600,
        count: 200,
      },
      removeOnFail: {
        age: 86400,
      },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
    },
  });
}

export const notificationQueue =
  globalForQueue.notificationQueue ?? createNotificationQueue();

if (process.env.NODE_ENV !== "production") {
  globalForQueue.notificationQueue = notificationQueue;
}
