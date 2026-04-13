// lib/notifications/create-notification.ts
// Helper centralizado para criar notificações.
//
// Fase R2: agora enfileira no BullMQ para processamento assincrono.
// Se Redis/BullMQ nao estiver disponivel, faz fallback sincrono (Prisma direto).

import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/lib/generated/prisma/enums";
import { invalidateCount, invalidateCountBatch } from "./cache";
import { notificationQueue } from "@/lib/queue/notification-queue";
import { ensureNotificationWorkerRunning } from "@/lib/queue/notification-worker";

export interface CreateNotificationInput {
  userId: string;       // Quem recebe
  creatorId?: string;   // Quem causou (null = sistema)
  cardId: string;       // Card relacionado
  boardId: string;      // Board (desnormalizado)
  commentId?: string;   // Comentário relacionado (se aplicável)
  type: NotificationType;
  data?: Record<string, string>; // Dados extras (nome card, texto, etc.)
}

/**
 * Cria uma única notificação.
 * Tenta enfileirar no BullMQ. Se falhar, faz fallback sincrono.
 */
export async function createNotification(input: CreateNotificationInput) {
  // Nunca notificar o próprio autor da ação
  if (input.creatorId && input.userId === input.creatorId) {
    return null;
  }

  // Tenta enfileirar no BullMQ
  try {
    ensureNotificationWorkerRunning();
    await notificationQueue.add(
      "notify-single",
      {
        kind: "notify-single" as const,
        userId: input.userId,
        creatorId: input.creatorId,
        cardId: input.cardId,
        boardId: input.boardId,
        commentId: input.commentId,
        type: input.type,
        data: input.data,
      },
      { jobId: `single-${input.cardId}-${input.userId}-${Date.now()}` }
    );
    return { queued: true };
  } catch {
    // Fallback sincrono se BullMQ falhar
    console.warn("[Notification] BullMQ indisponivel, usando fallback sincrono");
  }

  // Fallback sincrono
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        creatorId: input.creatorId || null,
        cardId: input.cardId,
        boardId: input.boardId,
        commentId: input.commentId || null,
        type: input.type,
        data: (input.data || {}) as object,
      },
    });

    invalidateCount(input.userId);
    return notification;
  } catch (error) {
    console.error("[Notification] Erro ao criar notificação:", error);
    return null;
  }
}

/**
 * Cria notificações para todos os membros/watchers de um card.
 * Tenta enfileirar no BullMQ. Se falhar, faz fallback sincrono.
 */
export async function notifyCardMembers(params: {
  excludeUserId?: string;
  excludeUserIds?: string[];
  cardId: string;
  boardId: string;
  type: NotificationType;
  data?: Record<string, string>;
  commentId?: string;
}) {
  const { excludeUserId, excludeUserIds = [], cardId, boardId, type, data, commentId } = params;

  // Tenta enfileirar no BullMQ
  try {
    ensureNotificationWorkerRunning();
    await notificationQueue.add(
      "notify-card-members",
      {
        kind: "notify-card-members" as const,
        excludeUserId,
        excludeUserIds,
        cardId,
        boardId,
        type,
        data,
        commentId,
      },
      { jobId: `members-${cardId}-${type}-${Date.now()}` }
    );
    return { queued: true };
  } catch {
    // Fallback sincrono se BullMQ falhar
    console.warn("[Notification] BullMQ indisponivel, usando fallback sincrono");
  }

  // Fallback sincrono
  try {
    const [cardMembers, cardWatchers] = await Promise.all([
      prisma.cardMember.findMany({ where: { cardId }, select: { userId: true } }),
      prisma.cardWatcher.findMany({ where: { cardId }, select: { userId: true } }),
    ]);

    const combinedIds = new Set([
      ...cardMembers.map((m) => m.userId),
      ...cardWatchers.map((w) => w.userId),
    ]);
    const excludes = new Set([...excludeUserIds, ...(excludeUserId ? [excludeUserId] : [])]);
    for (const ex of excludes) {
      combinedIds.delete(ex);
    }

    const recipientIds = Array.from(combinedIds);
    if (recipientIds.length === 0) return [];

    const notifications = await prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        creatorId: excludeUserId,
        cardId,
        boardId,
        commentId: commentId || null,
        type,
        data: (data || {}) as object,
      })),
    });

    invalidateCountBatch(recipientIds);
    return notifications;
  } catch (error) {
    console.error("[Notification] Erro ao notificar membros do card:", error);
    return [];
  }
}
