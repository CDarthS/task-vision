// lib/queue/notification-worker.ts — Worker que processa despacho de notificacoes
//
// Processa jobs da fila "notification-dispatch":
// - notify-single: cria 1 notificacao + invalida cache
// - notify-card-members: busca membros/watchers → cria batch → invalida cache
//
// Lazy-initialized via ensureNotificationWorkerRunning().

import { Worker, Job } from "bullmq";
import { redisConnection, QUEUE_PREFIX } from "./connection";
import {
  NOTIFICATION_QUEUE_NAME,
  NotificationJobData,
  NotifySingleJobData,
  NotifyCardMembersJobData,
} from "./notification-queue";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/lib/generated/prisma/enums";
import { invalidateCount, invalidateCountBatch } from "@/lib/notifications/cache";
import { publishNotification, publishNotificationBatch } from "@/lib/notifications/realtime";

// ─── Processadores ──────────────────────────────────────────

async function processNotifySingle(data: NotifySingleJobData) {
  // Nunca notificar o proprio autor
  if (data.creatorId && data.userId === data.creatorId) {
    return { created: 0, skipped: "self-notification" };
  }

  await prisma.notification.create({
    data: {
      userId: data.userId,
      creatorId: data.creatorId || null,
      cardId: data.cardId,
      boardId: data.boardId,
      commentId: data.commentId || null,
      type: data.type as NotificationType,
      data: (data.data || {}) as object,
    },
  });

  invalidateCount(data.userId);

  // Pub/Sub: notifica o browser do destinatario em tempo real
  publishNotification(data.userId, {
    type: data.type,
    cardTitle: data.data?.cardTitle,
  });

  return { created: 1 };
}

async function processNotifyCardMembers(data: NotifyCardMembersJobData) {
  // Busca membros + watchers do card
  const [cardMembers, cardWatchers] = await Promise.all([
    prisma.cardMember.findMany({
      where: { cardId: data.cardId },
      select: { userId: true },
    }),
    prisma.cardWatcher.findMany({
      where: { cardId: data.cardId },
      select: { userId: true },
    }),
  ]);

  // Une e remove o autor da acao e usuarios ignorados extra
  const combinedIds = new Set([
    ...cardMembers.map((m) => m.userId),
    ...cardWatchers.map((w) => w.userId),
  ]);
  const excludes = new Set([...(data.excludeUserIds || []), ...(data.excludeUserId ? [data.excludeUserId] : [])]);
  for (const ex of excludes) {
    combinedIds.delete(ex);
  }

  const recipientIds = Array.from(combinedIds);

  if (recipientIds.length === 0) {
    return { created: 0, recipients: 0 };
  }

  // Cria notificacoes em batch
  const result = await prisma.notification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      creatorId: data.excludeUserId,
      cardId: data.cardId,
      boardId: data.boardId,
      commentId: data.commentId || null,
      type: data.type as NotificationType,
      data: (data.data || {}) as object,
    })),
  });

  // Invalida cache de todos os destinatarios
  invalidateCountBatch(recipientIds);

  // Pub/Sub: notifica os browsers de todos os destinatarios em tempo real
  publishNotificationBatch(recipientIds, {
    type: data.type,
    cardTitle: data.data?.cardTitle,
  });

  return { created: result.count, recipients: recipientIds.length };
}

// ─── Worker ─────────────────────────────────────────────────

let worker: Worker<NotificationJobData> | null = null;

export function ensureNotificationWorkerRunning() {
  if (worker) return worker;

  if (!process.env.REDIS_URL) {
    console.warn("[NotifWorker] REDIS_URL nao configurada. Worker nao iniciado.");
    return null;
  }

  worker = new Worker<NotificationJobData>(
    NOTIFICATION_QUEUE_NAME,
    async (job: Job<NotificationJobData>) => {
      switch (job.data.kind) {
        case "notify-single":
          return await processNotifySingle(job.data as NotifySingleJobData);
        case "notify-card-members":
          return await processNotifyCardMembers(job.data as NotifyCardMembersJobData);
        default:
          throw new Error(`[NotifWorker] Job desconhecido: ${JSON.stringify(job.data)}`);
      }
    },
    {
      connection: redisConnection,
      prefix: QUEUE_PREFIX,
      concurrency: 3, // Processa ate 3 notificacoes em paralelo
      limiter: {
        max: 20,
        duration: 60000,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[NotifWorker] Job ${job.id} concluido:`, job.returnvalue);
  });

  worker.on("failed", (job, err) => {
    console.error(`[NotifWorker] Job ${job?.id} falhou:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[NotifWorker] Erro no worker:", err.message);
  });

  console.log("[NotifWorker] Worker de notificacoes iniciado.");
  return worker;
}

export function getNotificationWorkerStatus() {
  if (!worker) return "stopped";
  if (worker.isRunning()) return "running";
  return "paused";
}
