import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();

    const { newTitle, targetListId, targetBoardId, keepChecklists, keepMembers } = body;

    if (!newTitle || !targetListId || !targetBoardId) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // 1. Busca o card base com relações
    const sourceCard = await prisma.card.findUnique({
      where: { id },
      include: {
        list: {
          select: { boardId: true, board: { select: { workspaceId: true } } },
        },
        labels: true,
        checklists: {
          include: { items: true },
        },
        members: true,
      },
    });

    if (!sourceCard) {
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    }

    // 2. Verifica acesso do usuário ao workspace alvo (através do targetBoard)
    const targetBoard = await prisma.board.findUnique({
      where: { id: targetBoardId },
      include: { workspace: true },
    });

    if (!targetBoard) {
      return NextResponse.json({ error: "Quadro destino não encontrado" }, { status: 404 });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: targetBoard.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership && user.role !== "ADMIN" && targetBoard.workspace.ownerId !== user.id) {
      return NextResponse.json({ error: "Acesso negado ao quadro destino" }, { status: 403 });
    }

    // 3. Obter posição máxima na targetList para inserir no final
    const maxPositionCard = await prisma.card.findFirst({
      where: { listId: targetListId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const newPosition = maxPositionCard ? maxPositionCard.position + 1024 : 1024;

    // 4. Iniciar transaction para copiar card e relações
    const newCard = await prisma.$transaction(async (tx) => {
      // 4a. Criar o card
      const created = await tx.card.create({
        data: {
          title: newTitle,
          description: sourceCard.description,
          position: newPosition,
          dueDate: sourceCard.dueDate,
          isDueCompleted: sourceCard.isDueCompleted,
          creatorId: user.id,
          listId: targetListId,
        },
      });

      // 4b. Copiar Labels (apenas se for pro mesmo quadro)
      if (sourceCard.list.boardId === targetBoardId && sourceCard.labels.length > 0) {
        await tx.cardLabel.createMany({
          data: sourceCard.labels.map((cl) => ({
            cardId: created.id,
            labelId: cl.labelId,
          })),
        });
      }

      // 4c. Copiar Membros
      if (keepMembers && sourceCard.members.length > 0) {
        await tx.cardMember.createMany({
          data: sourceCard.members.map((m) => ({
            cardId: created.id,
            userId: m.userId,
          })),
        });
      }

      // 4d. Copiar Checklists & Items
      if (keepChecklists && sourceCard.checklists.length > 0) {
        for (const cl of sourceCard.checklists) {
          const newChecklist = await tx.checklist.create({
            data: {
              cardId: created.id,
              title: cl.title,
              position: cl.position,
            },
          });

          if (cl.items.length > 0) {
            await tx.checklistItem.createMany({
              data: cl.items.map((item) => ({
                checklistId: newChecklist.id,
                title: item.title,
                position: item.position,
                isCompleted: item.isCompleted,
                dueDate: item.dueDate,
                // Assumimos não copiar o assign para ser mais seguro em novos cards/boards
                // assigneeId: item.assigneeId 
              })),
            });
          }
        }
      }

      // 4e. Registrar Atividade
      await tx.activity.create({
        data: {
          cardId: created.id,
          userId: user.id,
          type: "CARD_CREATED",
          data: { listTitle: "Cópia", sourceCardId: sourceCard.id },
        },
      });

      return created;
    });

    return NextResponse.json({ card: newCard });
  } catch (err) {
    console.error(err);
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao copiar cartão" }, { status: 500 });
  }
}
