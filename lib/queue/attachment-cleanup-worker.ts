// lib/queue/attachment-cleanup-worker.ts — Worker que deleta arquivos do S3
//
// Processa jobs da fila "attachment-cleanup".
// Cada job contem uma lista de S3 keys para deletar.

import { Worker, Job } from "bullmq";
import { redisConnection, QUEUE_PREFIX } from "./connection";
import {
  ATTACHMENT_CLEANUP_QUEUE_NAME,
  DeleteKeysJobData,
} from "./attachment-cleanup-queue";
import { deleteFromS3 } from "@/lib/s3";

// ─── Processador ──────────────────────────────────────────

async function processDeleteKeys(data: DeleteKeysJobData) {
  console.log(
    `[AttachmentCleanupWorker] Deletando ${data.keys.length} keys (reason: ${data.reason})`
  );

  let deleted = 0;
  let failed = 0;

  for (const key of data.keys) {
    try {
      await deleteFromS3(key);
      deleted++;
    } catch (err) {
      failed++;
      console.error(`[AttachmentCleanupWorker] Falha ao deletar ${key}:`, err);
    }
  }

  console.log(
    `[AttachmentCleanupWorker] Concluido: ${deleted} deletados, ${failed} falharam`
  );

  return { deleted, failed };
}

// ─── Worker lazy-init ─────────────────────────────────────

const globalForWorker = globalThis as unknown as {
  attachmentCleanupWorker: Worker | undefined;
};

export function ensureAttachmentCleanupWorkerRunning() {
  if (globalForWorker.attachmentCleanupWorker) return;

  try {
    const worker = new Worker<DeleteKeysJobData>(
      ATTACHMENT_CLEANUP_QUEUE_NAME,
      async (job: Job<DeleteKeysJobData>) => {
        if (job.name === "delete-keys") {
          return processDeleteKeys(job.data);
        }
        console.warn(`[AttachmentCleanupWorker] Job desconhecido: ${job.name}`);
      },
      {
        connection: redisConnection,
        prefix: QUEUE_PREFIX,
        concurrency: 2,
        limiter: {
          max: 10,
          duration: 60000,
        },
      }
    );

    worker.on("completed", (job) => {
      console.log(`[AttachmentCleanupWorker] Job ${job.id} concluido`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[AttachmentCleanupWorker] Job ${job?.id} falhou:`, err.message);
    });

    globalForWorker.attachmentCleanupWorker = worker;
    console.log("[AttachmentCleanupWorker] Worker iniciado");
  } catch (err) {
    console.error("[AttachmentCleanupWorker] Falha ao iniciar worker:", err);
  }
}

export function getAttachmentCleanupWorkerStatus(): string {
  const worker = globalForWorker.attachmentCleanupWorker;
  if (!worker) return "stopped";
  if (worker.isPaused()) return "paused";
  return "running";
}
