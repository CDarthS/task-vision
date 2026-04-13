// lib/queue/attachment-cleanup-queue.ts — Fila de limpeza de arquivos S3
//
// Quando um card ou board e deletado, os arquivos no S3 precisam ser removidos.
// Esta fila processa as exclusoes de forma assincrona para nao atrasar a resposta da API.
//
// Tipos de jobs:
// - "delete-keys": Recebe lista de S3 keys e deleta cada uma

import { Queue } from "bullmq";
import { redisConnection, QUEUE_PREFIX } from "./connection";

export const ATTACHMENT_CLEANUP_QUEUE_NAME = "attachment-cleanup";

export interface DeleteKeysJobData {
  keys: string[]; // S3 keys para deletar
  reason: string; // "card-deleted" | "board-deleted" | "attachment-deleted"
}

// Singleton da fila
const globalForQueue = globalThis as unknown as {
  attachmentCleanupQueue: Queue<DeleteKeysJobData> | undefined;
};

function createQueue(): Queue<DeleteKeysJobData> {
  return new Queue<DeleteKeysJobData>(ATTACHMENT_CLEANUP_QUEUE_NAME, {
    connection: redisConnection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: {
      removeOnComplete: {
        age: 3600,
        count: 50,
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

export const attachmentCleanupQueue =
  globalForQueue.attachmentCleanupQueue ?? createQueue();

if (process.env.NODE_ENV !== "production") {
  globalForQueue.attachmentCleanupQueue = attachmentCleanupQueue;
}

// Helper: enfileira exclusao de keys S3
export async function enqueueS3Cleanup(keys: string[], reason: string) {
  if (keys.length === 0) return null;

  const job = await attachmentCleanupQueue.add(
    "delete-keys",
    { keys, reason },
    { jobId: `cleanup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
  );

  console.log(`[AttachmentCleanup] Job enfileirado: ${job.id} (${keys.length} keys, reason: ${reason})`);
  return job;
}
