import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";

// Helper: verifica permissao via checklist > card > list > board > workspace
async function verifyChecklistAccess(checklistId: string, userId: string, userRole: string) {
  const checklist = await prisma.checklist.findUnique({
    where: { id: checklistId },
    include: {
      card: {
        include: {
          list: {
            include: { board: { select: { workspaceId: true } } },
          },
        },
      },
    },
  });

  if (!checklist) return { error: "Checklist nao encontrada", status: 404 };

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: checklist.card.list.board.workspaceId,
        userId,
      },
    },
  });

  if (!membership && userRole !== "ADMIN") {
    return { error: "Sem permissao", status: 403 };
  }

  return { checklist };
}

// PATCH /api/checklists/[id] — atualizar titulo da checklist
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    const access = await verifyChecklistAccess(id, user.id, user.role);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const updated = await prisma.checklist.update({
      where: { id },
      data: { title: title?.trim() || "Checklist" },
      include: { items: { orderBy: { position: "asc" } } },
    });

    return NextResponse.json({ checklist: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/checklists/[id] — deletar checklist e todos itens
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const access = await verifyChecklistAccess(id, user.id, user.role);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    await prisma.checklist.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
