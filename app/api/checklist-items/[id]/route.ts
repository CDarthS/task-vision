import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";

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
                include: { board: { select: { workspaceId: true } } },
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

// PATCH /api/checklist-items/[id] — atualizar item (titulo ou isCompleted)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const { title, isCompleted } = body;

    const access = await verifyItemAccess(id, user.id, user.role);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;

    const updated = await prisma.checklistItem.update({
      where: { id },
      data: updateData,
    });

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
