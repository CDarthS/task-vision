import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";
import { createNotification } from "@/lib/notifications/create-notification";

// Helper: verifica permissao via item > checklist > card > list > board > workspace
async function verifyItemAccess(itemId: string, userId: string, userRole: string) {
  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: {
      checklist: {
        include: {
          card: {
            include: {
              list: {
                include: { board: { select: { id: true, workspaceId: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!item) return { error: "Item nao encontrado", status: 404 };

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: item.checklist.card.list.board.workspaceId,
        userId,
      },
    },
  });

  if (!membership && userRole !== "ADMIN") {
    return { error: "Sem permissao", status: 403 };
  }

  return { item };
}

// PATCH /api/checklist-items/[id] — atualizar item (titulo, isCompleted, assigneeId, dueDate)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const { title, isCompleted, assigneeId, dueDate } = body;

    const access = await verifyItemAccess(id, user.id, user.role);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const item = access.item;
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title.trim();
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;

    // assigneeId: null remove o responsável, string define um novo
    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId === null ? null : assigneeId;
    }

    // dueDate: null remove, string define
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate === null ? null : new Date(dueDate);
    }

    const updated = await prisma.checklistItem.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    // Notificar o responsável atribuído (somente quando assigneeId mudou para um novo user)
    const prevAssigneeId = item.assigneeId;
    const newAssigneeId = updated.assigneeId;

    if (
      newAssigneeId &&
      newAssigneeId !== prevAssigneeId &&
      newAssigneeId !== user.id
    ) {
      const card = item.checklist.card;
      const boardId = card.list.board.id;

      createNotification({
        userId: newAssigneeId,
        creatorId: user.id,
        cardId: card.id,
        boardId,
        type: "CHECKLIST_ITEM_ASSIGNED",
        data: {
          itemTitle: updated.title,
          cardTitle: card.title,
          assignerName: user.name,
          ...(updated.dueDate
            ? { dueDate: updated.dueDate.toISOString() }
            : {}),
        },
      });
    }

    return NextResponse.json({ item: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/checklist-items/[id] — deletar item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const access = await verifyItemAccess(id, user.id, user.role);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    await prisma.checklistItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
