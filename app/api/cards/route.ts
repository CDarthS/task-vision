import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";
import { logActivity } from "@/lib/activity";

// POST /api/cards — criar card dentro de uma lista
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { title, listId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Titulo e obrigatorio" },
        { status: 400 }
      );
    }

    if (!listId) {
      return NextResponse.json(
        { error: "listId e obrigatorio" },
        { status: 400 }
      );
    }

    // Busca a lista e verifica permissao
    const list = await prisma.list.findUnique({
      where: { id: listId },
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
        { error: "Sem permissao" },
        { status: 403 }
      );
    }

    // Pega a maior posicao existente para colocar no final
    const lastCard = await prisma.card.findFirst({
      where: { listId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const position = (lastCard?.position ?? 0) + 1000;

    const card = await prisma.card.create({
      data: {
        title: title.trim(),
        listId,
        position,
        creatorId: user.id,
      },
    });

    // Registra atividade CARD_CREATED com o criador real
    logActivity({
      cardId: card.id,
      userId: user.id,
      type: "CARD_CREATED",
      data: { listTitle: list.title },
    });

    return NextResponse.json({ card }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
