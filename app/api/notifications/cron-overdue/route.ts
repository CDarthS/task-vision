import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";

// GET /api/notifications/cron-overdue
// "Cron Virtual" — verifica cards E itens de checklist em atraso.
// Chamado pelo polling do NotificationBell a cada ~2 minutos.
export async function GET() {
  try {
    await requireUser(); // Apenas usuários autenticados podem acionar

    const now = new Date();
    let totalCreated = 0;

    // ── PARTE 1: Cards em atraso ─────────────────────────────────────────────
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

    for (const card of overdueCards) {
      if (card.members.length === 0) continue;

      const memberUserIds = card.members.map((m) => m.userId);
      const boardId = card.list.board.id;

      const existingNotifications = await prisma.notification.findMany({
        where: {
          cardId: card.id,
          type: "DUE_DATE_OVERDUE",
          userId: { in: memberUserIds },
        },
        select: { userId: true },
      });

      const alreadyNotifiedIds = new Set(existingNotifications.map((n) => n.userId));
      const newRecipientIds = memberUserIds.filter((id) => !alreadyNotifiedIds.has(id));

      if (newRecipientIds.length === 0) continue;

      const result = await prisma.notification.createMany({
        data: newRecipientIds.map((userId) => ({
          userId,
          creatorId: null,
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

    // ── PARTE 2: Itens de Checklist em atraso ───────────────────────────────
    const overdueItems = await prisma.checklistItem.findMany({
      where: {
        dueDate: { lt: now },
        isCompleted: false,
        assigneeId: { not: null }, // Só processa itens com responsável
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

    for (const item of overdueItems) {
      if (!item.assigneeId) continue;

      const card = item.checklist.card;
      const boardId = card.list.board.id;

      // Idempotente: verifica se já foi notificado para este item
      const existing = await prisma.notification.findFirst({
        where: {
          userId: item.assigneeId,
          type: "CHECKLIST_ITEM_OVERDUE",
          // Armazenamos o itemId em data para evitar duplicatas
          data: { path: ["itemId"], equals: item.id },
        },
      });

      if (existing) continue;

      await prisma.notification.create({
        data: {
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
        },
      });

      totalCreated += 1;
    }

    return NextResponse.json({
      processedCards: overdueCards.length,
      processedItems: overdueItems.length,
      created: totalCreated,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    console.error("[CronOverdue] Erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
