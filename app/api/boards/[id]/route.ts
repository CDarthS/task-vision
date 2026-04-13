import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";
import { cleanupBoardAttachments } from "@/lib/attachments/cleanup";

// GET /api/boards/[id] — buscar board com listas e cards
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        workspace: {
          select: { id: true, name: true, ownerId: true },
        },
        lists: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              orderBy: { position: "asc" },
              include: {
                watchers: { select: { userId: true } },
                members: { select: { userId: true } },
              }
            },
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board nao encontrado" }, { status: 404 });
    }

    // Verifica se o usuario tem acesso ao workspace do board
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: board.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    return NextResponse.json({ board });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH /api/boards/[id] — atualizar board (titulo, background)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const board = await prisma.board.findUnique({
      where: { id },
      select: { id: true, workspaceId: true },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board nao encontrado" },
        { status: 404 }
      );
    }

    // Verifica se o usuario tem acesso ao workspace do board
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: board.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title || title.length > 128) {
        return NextResponse.json(
          { error: "Titulo invalido" },
          { status: 400 }
        );
      }
      data.title = title;
    }

    if (body.background !== undefined) {
      data.background = body.background;
    }

    const updated = await prisma.board.update({
      where: { id },
      data,
    });

    return NextResponse.json({ board: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/boards/[id] — deletar board (cascade deleta listas e cards)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const board = await prisma.board.findUnique({
      where: { id },
      select: { id: true, workspaceId: true },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board nao encontrado" },
        { status: 404 }
      );
    }

    // Verifica se e owner do workspace ou admin
    const workspace = await prisma.workspace.findUnique({
      where: { id: board.workspaceId },
      select: { ownerId: true },
    });

    const isOwner = workspace?.ownerId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    // Limpa arquivos S3 ANTES do cascade delete apagar os registros
    await cleanupBoardAttachments(id);

    await prisma.board.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
