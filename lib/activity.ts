// lib/activity.ts
// Helper centralizado para registrar atividades no histórico do card.
// Segue o mesmo padrão fire-and-forget de lib/notifications/create-notification.ts

import { prisma } from "@/lib/prisma";

// Tipos de atividade suportados
export const ACTIVITY_TYPES = {
  // Card
  CARD_CREATED: "CARD_CREATED",
  CARD_TITLE_UPDATED: "CARD_TITLE_UPDATED",
  CARD_DESCRIPTION_UPDATED: "CARD_DESCRIPTION_UPDATED",
  CARD_MOVED: "CARD_MOVED",
  CARD_COMPLETED: "CARD_COMPLETED",
  CARD_UNCOMPLETED: "CARD_UNCOMPLETED",
  DUE_DATE_SET: "DUE_DATE_SET",
  DUE_DATE_REMOVED: "DUE_DATE_REMOVED",
  // Membros
  MEMBER_ADDED: "MEMBER_ADDED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
  // Labels
  LABEL_ADDED: "LABEL_ADDED",
  LABEL_REMOVED: "LABEL_REMOVED",
  // Checklists
  CHECKLIST_ADDED: "CHECKLIST_ADDED",
  CHECKLIST_REMOVED: "CHECKLIST_REMOVED",
  // Comentários (os comentários já existem como entidade separada,
  // mas registramos como atividade para o feed unificado)
  COMMENT_ADDED: "COMMENT_ADDED",
} as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];

export interface LogActivityInput {
  cardId: string;
  userId: string;
  type: ActivityType;
  data?: Record<string, string>;
}

/**
 * Registra uma atividade no histórico do card.
 * Fire-and-forget — nunca deve quebrar a ação principal.
 */
export async function logActivity(input: LogActivityInput) {
  try {
    await prisma.activity.create({
      data: {
        cardId: input.cardId,
        userId: input.userId,
        type: input.type,
        data: (input.data || {}) as object,
      },
    });
  } catch (error) {
    console.error("[Activity] Erro ao registrar atividade:", error);
  }
}
