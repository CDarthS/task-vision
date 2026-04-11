import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";

// GET /api/notifications/cron-overdue
// "Cron Virtual" — verifica todos os cards em atraso e cria notificações
// DUE_DATE_OVERDUE para membros que ainda não foram notificados.
// Chamado pelo polling do NotificationBell a cada ~2 minutos.
export async function GET() {
  try {
    await requireUser(); // Apenas usuários autenticados podem acionar

    const now = new Date();

    // 1. Buscar todos os cards em atraso (dueDate no passado, não completado)
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

    if (overdueCards.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let totalCreated = 0;

    for (const card of overdueCards) {
      if (card.members.length === 0) continue;

      const memberUserIds = card.members.map((m) => m.userId);
      const boardId = card.list.board.id;

      // 2. Verificar quais membros já receberam DUE_DATE_OVERDUE para este card
      const existingNotifications = await prisma.notification.findMany({
        where: {
          cardId: card.id,
          type: "DUE_DATE_OVERDUE",
          userId: { in: memberUserIds },
        },
        select: { userId: true },
      });

      const alreadyNotifiedIds = new Set(existingNotifications.map((n) => n.userId));

      // 3. Filtrar apenas quem ainda não foi notificado
      const newRecipientIds = memberUserIds.filter((id) => !alreadyNotifiedIds.has(id));

      if (newRecipientIds.length === 0) continue;

      // 4. Criar notificações em batch
      const result = await prisma.notification.createMany({
        data: newRecipientIds.map((userId) => ({
          userId,
          creatorId: null, // Sistema, não um user
          cardId: card.id,
          boardId,
          type: "DUE_DATE_OVERDUE" as const,
          data: {
            cardTitle: card.title,
            dueDate: card.dueDate!.toISOString(),
          } as object,
        })),
      });

      totalCreated += result.count;
    }

    return NextResponse.json({ processed: overdueCards.length, created: totalCreated });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    console.error("[CronOverdue] Erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
