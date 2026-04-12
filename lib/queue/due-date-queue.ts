// lib/queue/due-date-queue.ts — Fila de notificacoes de "Data de Entrega Proxima"
//
// Primeiro caso de uso do BullMQ no Task Vision.
// Processa notificacoes de due date de forma assincrona, tirando o peso
// das API Routes (antes era sincrono no cron-overdue).
//
// Tipos de jobs:
// - "scan-due-dates": Varre todos os cards e cria notificacoes em batch
// - "notify-single":  Notifica um card especifico (futuro uso em webhooks/automacoes)

import { Queue } from "bullmq";
import { redisConnection, QUEUE_PREFIX } from "./connection";

// Nome da fila
export const DUE_DATE_QUEUE_NAME = "due-date-notifications";

// Tipos de dados que cada job aceita
export interface ScanDueDatesJobData {
  triggeredBy: string; // "cron-virtual" | "manual" | "api"
  timestamp: string;   // ISO string de quando o scan foi solicitado
}

export interface NotifySingleCardJobData {
  cardId: string;
  reason: "due-soon" | "overdue";
}

export type DueDateJobData = ScanDueDatesJobData | NotifySingleCardJobData;

// Singleton da fila (mesmo padrao globalThis)
const globalForQueue = globalThis as unknown as {
  dueDateQueue: Queue<DueDateJobData> | undefined;
};

function createDueDateQueue(): Queue<DueDateJobData> {
  return new Queue<DueDateJobData>(DUE_DATE_QUEUE_NAME, {
    connection: redisConnection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: {
      removeOnComplete: {
        age: 3600,  // Remove jobs completos apos 1 hora
        count: 100, // Mantem no maximo 100 jobs completos
      },
      removeOnFail: {
        age: 86400, // Remove jobs falhados apos 24 horas
      },
      attempts: 3,          // 3 tentativas em caso de erro
      backoff: {
        type: "exponential",
        delay: 5000,         // 5s, 10s, 20s entre retries
      },
    },
  });
}

export const dueDateQueue =
  globalForQueue.dueDateQueue ?? createDueDateQueue();

if (process.env.NODE_ENV !== "production") {
  globalForQueue.dueDateQueue = dueDateQueue;
}

// Helper: Enfileira um scan completo de due dates
export async function enqueueDueDateScan(triggeredBy: string) {
  const jobId = `scan-${Date.now()}`;
  
  const job = await dueDateQueue.add(
    "scan-due-dates",
    {
      triggeredBy,
      timestamp: new Date().toISOString(),
    } as ScanDueDatesJobData,
    {
      jobId,
      // Deduplicacao: se ja existe um scan pendente nos ultimos 60s, nao cria outro
      // Isso evita scans duplicados do polling de multiplos usuarios
    }
  );

  console.log(`[DueDateQueue] Job enfileirado: ${job.id} (trigger: ${triggeredBy})`);
  return job;
}

// Helper: Enfileira notificacao para um card especifico
export async function enqueueCardNotification(
  cardId: string,
  reason: "due-soon" | "overdue"
) {
  const job = await dueDateQueue.add(
    "notify-single",
    { cardId, reason } as NotifySingleCardJobData,
    {
      jobId: `card-${cardId}-${reason}-${Date.now()}`,
    }
  );

  console.log(`[DueDateQueue] Notificacao enfileirada: card=${cardId}, reason=${reason}`);
  return job;
}
