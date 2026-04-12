// lib/queue/due-date-worker.ts — Worker que processa notificacoes de due date
//
// Este worker roda no mesmo processo do Next.js (serverless-friendly).
// Ao ser importado, instancia o Worker do BullMQ e comeca a processar jobs
// da fila "due-date-notifications".
//
// Logica de processamento:
// 1. "scan-due-dates": Varre cards e checklist items em atraso (mesma logica do cron-overdue)
// 2. "notify-single": Cria notificacao para um card especifico
//
// O worker e lazy-initialized na primeira chamada a ensureWorkerRunning().

import { Worker, Job } from "bullmq";
import { redisConnection, QUEUE_PREFIX } from "./connection";
import {
  DUE_DATE_QUEUE_NAME,
  DueDateJobData,
  ScanDueDatesJobData,
  NotifySingleCardJobData,
} from "./due-date-queue";
import { prisma } from "@/lib/prisma";
import { invalidateCountBatch } from "@/lib/notifications/cache";
import { publishNotificationBatch } from "@/lib/notifications/realtime";

// ─── Processadores ──────────────────────────────────────────

async function processScanDueDates(data: ScanDueDatesJobData) {
  console.log(
    `[DueDateWorker] Iniciando scan (trigger: ${data.triggeredBy}, ts: ${data.timestamp})`
  );

  const now = new Date();
  let totalCreated = 0;

  // ── PARTE 1: Cards em atraso ──────────────────────────────
  const overdueCards = await prisma.card.findMany({
    where: {
      dueDate: { lt: now },
      isDueCompleted: false,
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      list: {
        select: {
          board: { select: { id: true } },
        },
      },
      members: {
        select: { userId: true },
      },
    },
  });

  const cardsWithMembers = overdueCards.filter((c) => c.members.length > 0);
  const cardIds = cardsWithMembers.map((c) => c.id);

  // Batch query: busca TODAS as notificacoes DUE_DATE_OVERDUE existentes
  const existingNotifications =
    cardIds.length > 0
      ? await prisma.notification.findMany({
          where: {
            cardId: { in: cardIds },
            type: "DUE_DATE_OVERDUE",
          },
          select: { cardId: true, userId: true },
        })
      : [];

  const alreadyNotified = new Set(
    existingNotifications.map((n) => `${n.cardId}:${n.userId}`)
  );

  const allNewNotifications: {
    userId: string;
    creatorId: null;
    cardId: string;
    boardId: string;
    type: "DUE_DATE_OVERDUE";
    data: object;
  }[] = [];

  for (const card of cardsWithMembers) {
    const boardId = card.list.board.id;

    for (const member of card.members) {
      if (alreadyNotified.has(`${card.id}:${member.userId}`)) continue;

      allNewNotifications.push({
        userId: member.userId,
        creatorId: null,
        cardId: card.id,
        boardId,
        type: "DUE_DATE_OVERDUE",
        data: {
          cardTitle: card.title,
          dueDate: card.dueDate!.toISOString(),
        } as object,
      });
    }
  }

  if (allNewNotifications.length > 0) {
    const result = await prisma.notification.createMany({
      data: allNewNotifications,
    });
    totalCreated += result.count;
    const userIds = allNewNotifications.map((n) => n.userId);
    invalidateCountBatch(userIds);
    publishNotificationBatch(userIds, { type: "DUE_DATE_OVERDUE" });
  }

  // ── PARTE 2: Itens de Checklist em atraso ─────────────────
  const overdueItems = await prisma.checklistItem.findMany({
    where: {
      dueDate: { lt: now },
      isCompleted: false,
      assigneeId: { not: null },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      assigneeId: true,
      checklist: {
        select: {
          card: {
            select: {
              id: true,
              title: true,
              list: {
                select: {
                  board: { select: { id: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const itemIds = overdueItems.map((i) => i.id);
  const existingItemNotifications =
    itemIds.length > 0
      ? await prisma.notification.findMany({
          where: {
            type: "CHECKLIST_ITEM_OVERDUE",
            userId: {
              in: overdueItems
                .filter((i) => i.assigneeId)
                .map((i) => i.assigneeId!),
            },
          },
          select: { data: true },
        })
      : [];

  const notifiedItemIds = new Set(
    existingItemNotifications
      .map((n) => (n.data as { itemId?: string })?.itemId)
      .filter(Boolean)
  );

  const newItemNotifications: {
    userId: string;
    creatorId: null;
    cardId: string;
    boardId: string;
    type: "CHECKLIST_ITEM_OVERDUE";
    data: object;
  }[] = [];

  for (const item of overdueItems) {
    if (!item.assigneeId) continue;
    if (notifiedItemIds.has(item.id)) continue;

    const card = item.checklist.card;
    const boardId = card.list.board.id;

    newItemNotifications.push({
      userId: item.assigneeId,
      creatorId: null,
      cardId: card.id,
      boardId,
      type: "CHECKLIST_ITEM_OVERDUE",
      data: {
        itemId: item.id,
        itemTitle: item.title,
        cardTitle: card.title,
        dueDate: item.dueDate!.toISOString(),
      } as object,
    });
  }

  if (newItemNotifications.length > 0) {
    const result = await prisma.notification.createMany({
      data: newItemNotifications,
    });
    totalCreated += result.count;
    const itemUserIds = newItemNotifications.map((n) => n.userId);
    invalidateCountBatch(itemUserIds);
    publishNotificationBatch(itemUserIds, { type: "CHECKLIST_ITEM_OVERDUE" });
  }

  console.log(
    `[DueDateWorker] Scan concluido: ${overdueCards.length} cards, ${overdueItems.length} items, ${totalCreated} notificacoes criadas`
  );

  return {
    processedCards: overdueCards.length,
    processedItems: overdueItems.length,
    created: totalCreated,
  };
}

async function processNotifySingleCard(data: NotifySingleCardJobData) {
  console.log(
    `[DueDateWorker] Processando card ${data.cardId} (reason: ${data.reason})`
  );

  const card = await prisma.card.findUnique({
    where: { id: data.cardId },
    select: {
      id: true,
      title: true,
      dueDate: true,
      list: {
        select: {
          board: { select: { id: true } },
        },
      },
      members: {
        select: { userId: true },
      },
    },
  });

  if (!card || card.members.length === 0) {
    console.log(`[DueDateWorker] Card ${data.cardId} nao encontrado ou sem membros`);
    return { created: 0 };
  }

  const type = data.reason === "overdue" ? "DUE_DATE_OVERDUE" : "DUE_DATE_SOON";
  const boardId = card.list.board.id;

  // Verifica quais membros ja receberam esta notificacao
  const existing = await prisma.notification.findMany({
    where: {
      cardId: card.id,
      type,
    },
    select: { userId: true },
  });

  const alreadyNotified = new Set(existing.map((n) => n.userId));
  const newNotifications = card.members
    .filter((m) => !alreadyNotified.has(m.userId))
    .map((m) => ({
      userId: m.userId,
      creatorId: null,
      cardId: card.id,
      boardId,
      type: type as "DUE_DATE_OVERDUE" | "DUE_DATE_SOON",
      data: {
        cardTitle: card.title,
        dueDate: card.dueDate?.toISOString() || "",
      } as object,
    }));

  if (newNotifications.length > 0) {
    await prisma.notification.createMany({ data: newNotifications });
    const singleUserIds = newNotifications.map((n) => n.userId);
    invalidateCountBatch(singleUserIds);
    publishNotificationBatch(singleUserIds, {
      type: data.reason === "overdue" ? "DUE_DATE_OVERDUE" : "DUE_DATE_SOON",
      cardTitle: card.title,
    });
  }

  console.log(
    `[DueDateWorker] Card ${data.cardId}: ${newNotifications.length} notificacoes criadas`
  );

  return { created: newNotifications.length };
}

// ─── Worker ─────────────────────────────────────────────────

let worker: Worker<DueDateJobData> | null = null;

export function ensureWorkerRunning() {
  if (worker) return worker;

  // Nao iniciar worker se REDIS_URL nao estiver configurada
  if (!process.env.REDIS_URL) {
    console.warn("[DueDateWorker] REDIS_URL nao configurada. Worker nao iniciado.");
    return null;
  }

  worker = new Worker<DueDateJobData>(
    DUE_DATE_QUEUE_NAME,
    async (job: Job<DueDateJobData>) => {
      switch (job.name) {
        case "scan-due-dates":
          return await processScanDueDates(job.data as ScanDueDatesJobData);
        case "notify-single":
          return await processNotifySingleCard(
            job.data as NotifySingleCardJobData
          );
        default:
          throw new Error(`[DueDateWorker] Job desconhecido: ${job.name}`);
      }
    },
    {
      connection: redisConnection,
      prefix: QUEUE_PREFIX,
      concurrency: 1, // Processa 1 job por vez (evita race conditions no banco)
      limiter: {
        max: 5,          // Max 5 jobs
        duration: 60000, // Por minuto
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[DueDateWorker] Job ${job.id} concluido:`, job.returnvalue);
  });

  worker.on("failed", (job, err) => {
    console.error(`[DueDateWorker] Job ${job?.id} falhou:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[DueDateWorker] Erro no worker:", err.message);
  });

  console.log("[DueDateWorker] Worker iniciado com sucesso.");
  return worker;
}

// Exporta para testes e health checks
export function getWorkerStatus() {
  if (!worker) return "stopped";
  if (worker.isRunning()) return "running";
  return "paused";
}
