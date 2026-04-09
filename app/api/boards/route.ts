import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";

// POST /api/boards — criar board dentro de um workspace
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { title, workspaceId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Titulo e obrigatorio" },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId e obrigatorio" },
        { status: 400 }
      );
    }

    // Verifica se o usuario tem acesso ao workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: user.id },
      },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Sem permissao" },
        { status: 403 }
      );
    }

    // Pega a maior posicao existente para colocar no final
    const lastBoard = await prisma.board.findFirst({
      where: { workspaceId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const position = (lastBoard?.position ?? 0) + 1000;

    const board = await prisma.board.create({
      data: {
        title: title.trim(),
        workspaceId,
        position,
      },
    });

    return NextResponse.json({ board }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
