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

    // Filtra apenas cards com membros
    const cardsWithMembers = overdueCards.filter((c) => c.members.length > 0);
    const cardIds = cardsWithMembers.map((c) => c.id);

    // Batch query: busca TODAS as notificacoes DUE_DATE_OVERDUE existentes de uma vez
    const existingNotifications = cardIds.length > 0
      ? await prisma.notification.findMany({
          where: {
            cardId: { in: cardIds },
            type: "DUE_DATE_OVERDUE",
          },
          select: { cardId: true, userId: true },
        })
      : [];

    // Monta set de "cardId:userId" ja notificados
    const alreadyNotified = new Set(
      existingNotifications.map((n) => `${n.cardId}:${n.userId}`)
    );

    // Coleta todos os createMany data de uma vez
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

    // Batch query: busca notificacoes CHECKLIST_ITEM_OVERDUE existentes
    const itemIds = overdueItems.map((i) => i.id);
    const existingItemNotifications = itemIds.length > 0
      ? await prisma.notification.findMany({
          where: {
            type: "CHECKLIST_ITEM_OVERDUE",
            userId: { in: overdueItems.filter((i) => i.assigneeId).map((i) => i.assigneeId!) },
          },
          select: { data: true },
        })
      : [];

    // Extrai itemIds ja notificados do campo JSON data
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
