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

    const card = await prisma.card.findUnique({
      where: { id },
      select: { id: true, list: { select: { board: { select: { workspaceId: true } } } } },
    });

    if (!card) {
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    }

    // Verifica permissão no workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: card.list.board.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // Verifica se já está seguindo
    const existingWatcher = await prisma.cardWatcher.findUnique({
      where: {
        cardId_userId: {
          cardId: id,
          userId: user.id,
        },
      },
    });

    if (existingWatcher) {
      // Se existir, para de seguir
      await prisma.cardWatcher.delete({
        where: { id: existingWatcher.id },
      });
      return NextResponse.json({ watching: false });
    } else {
      // Se não existir, começa a seguir
      await prisma.cardWatcher.create({
        data: {
          cardId: id,
          userId: user.id,
        },
      });
      return NextResponse.json({ watching: true });
    }
  } catch (err) {
    console.error("[CardWatcher] Erro:", err);
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
