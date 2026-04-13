// lib/attachments/cleanup.ts — Helpers para limpar arquivos S3 ao deletar cards/boards
//
// Busca attachments do tipo arquivo (nao link) no banco e enfileira exclusao no S3.
// Fallback sincrono caso o BullMQ/Redis esteja indisponivel.

import { prisma } from "@/lib/prisma";
import { extractS3KeyFromUrl, deleteFromS3 } from "@/lib/s3";
import { enqueueS3Cleanup } from "@/lib/queue/attachment-cleanup-queue";
import { ensureAttachmentCleanupWorkerRunning } from "@/lib/queue/attachment-cleanup-worker";

/**
 * Limpa arquivos S3 de todos os attachments de um card.
 * Chamar ANTES do prisma.card.delete() (cascade apaga os registros).
 */
export async function cleanupCardAttachments(cardId: string) {
  try {
    const attachments = await prisma.attachment.findMany({
      where: { cardId, type: { not: "link" } },
      select: { url: true },
    });

    const keys = attachments
      .map((a) => extractS3KeyFromUrl(a.url))
      .filter((k): k is string => k !== null);

    if (keys.length === 0) return;

    try {
      ensureAttachmentCleanupWorkerRunning();
      await enqueueS3Cleanup(keys, "card-deleted");
    } catch {
      // Fallback sincrono se Redis indisponivel
      console.warn("[AttachmentCleanup] BullMQ indisponivel, deletando sincronamente");
      await Promise.allSettled(keys.map((k) => deleteFromS3(k)));
    }
  } catch (err) {
    console.error("[AttachmentCleanup] Erro ao limpar card:", err);
    // Nao bloqueia a exclusao do card
  }
}

/**
 * Limpa arquivos S3 de todos os attachments de todos os cards de um board.
 * Chamar ANTES do prisma.board.delete() (cascade apaga cards e attachments).
 */
export async function cleanupBoardAttachments(boardId: string) {
  try {
    const attachments = await prisma.attachment.findMany({
      where: {
        card: { list: { boardId } },
        type: { not: "link" },
      },
      select: { url: true },
    });

    const keys = attachments
      .map((a) => extractS3KeyFromUrl(a.url))
      .filter((k): k is string => k !== null);

    if (keys.length === 0) return;

    try {
      ensureAttachmentCleanupWorkerRunning();
      await enqueueS3Cleanup(keys, "board-deleted");
    } catch {
      console.warn("[AttachmentCleanup] BullMQ indisponivel, deletando sincronamente");
      await Promise.allSettled(keys.map((k) => deleteFromS3(k)));
    }
  } catch (err) {
    console.error("[AttachmentCleanup] Erro ao limpar board:", err);
  }
}
