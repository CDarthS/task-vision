import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";

// POST /api/cards/[id]/comments/reactions — toggle emoji reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { commentId, emoji } = await request.json();

    if (!commentId || !emoji || typeof emoji !== "string" || emoji.length > 8) {
      return NextResponse.json({ error: "commentId e emoji sao obrigatorios" }, { status: 400 });
    }

    // Verifica que o comentario pertence a este card
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { card: { include: { list: { include: { board: { select: { workspaceId: true } } } } } } },
    });

    if (!comment || comment.cardId !== id) {
      return NextResponse.json({ error: "Comentario nao encontrado" }, { status: 404 });
    }

    // Verifica permissao
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: comment.card.list.board.workspaceId, userId: user.id } },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    // Toggle: se ja existe, remove; se nao, cria
    const existing = await prisma.commentReaction.findUnique({
      where: { commentId_userId_emoji: { commentId, userId: user.id, emoji } },
    });

    if (existing) {
      await prisma.commentReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.commentReaction.create({
        data: { commentId, userId: user.id, emoji },
      });
    }

    // Retorna todas as reactions do comentario atualizadas
    const reactions = await prisma.commentReaction.findMany({
      where: { commentId },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ reactions, toggled: !existing });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
