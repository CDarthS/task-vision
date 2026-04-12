import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "O titulo da lista nao pode ser vazio" },
        { status: 400 }
      );
    }

    // Busca a lista para validar permissao no board/workspace relacionado
    const list = await prisma.list.findUnique({
      where: { id },
      include: {
        board: {
          select: { workspaceId: true },
        },
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: "Lista nao encontrada" },
        { status: 404 }
      );
    }

    // Valida membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: list.board.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Sem permissao para editar esta lista" },
        { status: 403 }
      );
    }

    const updatedList = await prisma.list.update({
      where: { id },
      data: { title: title.trim() },
    });

    return NextResponse.json({ list: updatedList });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

// DELETE /api/lists/[id] — deletar lista (cascade deleta cards)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const list = await prisma.list.findUnique({
      where: { id },
      include: {
        board: {
          select: { workspaceId: true },
        },
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: "Lista nao encontrada" },
        { status: 404 }
      );
    }

    // Valida membership no workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: list.board.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Sem permissao para deletar esta lista" },
        { status: 403 }
      );
    }

    await prisma.list.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
