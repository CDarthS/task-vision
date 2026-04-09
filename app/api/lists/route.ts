import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";

// POST /api/lists — criar lista dentro de um board
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { title, boardId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Titulo e obrigatorio" },
        { status: 400 }
      );
    }

    if (!boardId) {
      return NextResponse.json(
        { error: "boardId e obrigatorio" },
        { status: 400 }
      );
    }

    // Busca o board e verifica permissao
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { workspaceId: true },
    });

    if (!board) {
      return NextResponse.json(
        { error: "Board nao encontrado" },
        { status: 404 }
      );
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: board.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Sem permissao" },
        { status: 403 }
      );
    }

    // Pega a maior posicao existente para colocar no final
    const lastList = await prisma.list.findFirst({
      where: { boardId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const position = (lastList?.position ?? 0) + 1000;

    const list = await prisma.list.create({
      data: {
        title: title.trim(),
        boardId,
        position,
      },
      include: {
        cards: true,
      },
    });

    return NextResponse.json({ list }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
