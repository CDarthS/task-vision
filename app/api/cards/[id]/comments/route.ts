import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";
import { notifyCardMembers, createNotification } from "@/lib/notifications/create-notification";
import { logActivity } from "@/lib/activity";

// GET /api/cards/[id]/comments — listar comentarios do card
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        list: {
          include: {
            board: { select: { workspaceId: true } },
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card nao encontrado" }, { status: 404 });
    }

    // Verifica permissao
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: card.list.board.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    const comments = await prisma.comment.findMany({
      where: { cardId: id },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        reactions: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ comments });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/cards/[id]/comments — criar comentario
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const { text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Texto e obrigatorio" }, { status: 400 });
    }

    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        list: {
          include: {
            board: { select: { id: true, workspaceId: true } },
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card nao encontrado" }, { status: 404 });
    }

    // Verifica permissao
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: card.list.board.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    const comment = await prisma.comment.create({
      data: {
        text: text.trim(),
        cardId: id,
        userId: user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    // Logica de menções
    const textTrimmed = text.trim();
    const mentionMatches = textTrimmed.match(/@[\w_]+/g) || [];
    const mentions: string[] = Array.from(new Set(mentionMatches.map((m: string) => m.substring(1).toLowerCase())));
    
    let mentionedUserIds: string[] = [];
    const hasCardMention = mentions.includes("card");

    if (mentions.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: {
          username: { in: mentions },
          workspaceMembers: { some: { workspaceId: card.list.board.workspaceId } }
        },
        select: { id: true }
      });
      mentionedUserIds = mentionedUsers.map(u => u.id);
    }

    // Dispara notificação individual (cuidado para nao mandar pro autor)
    for (const mentionedUserId of mentionedUserIds) {
      if (mentionedUserId === user.id) continue;
      createNotification({
        userId: mentionedUserId,
        creatorId: user.id,
        cardId: id,
        boardId: card.list.board.id,
        type: "USER_MENTIONED",
        data: { cardTitle: card.title, commentText: textTrimmed.substring(0, 100) },
        commentId: comment.id,
      });
    }

    // Dispara notificação para membros do card - se tiver @card é menção geral
    if (hasCardMention) {
      notifyCardMembers({
        excludeUserId: user.id,
        excludeUserIds: mentionedUserIds,
        cardId: id,
        boardId: card.list.board.id,
        type: "USER_MENTIONED",
        data: { cardTitle: card.title, commentText: textTrimmed.substring(0, 100) },
        commentId: comment.id,
      });
    } else {
      // Dispara apenas notificação padrao de comentario
      notifyCardMembers({
        excludeUserId: user.id,
        excludeUserIds: mentionedUserIds,
        cardId: id,
        boardId: card.list.board.id,
        type: "COMMENT_ADDED",
        data: { cardTitle: card.title, commentText: textTrimmed.substring(0, 100) },
        commentId: comment.id,
      });
    }

    // Registra atividade
    logActivity({
      cardId: id,
      userId: user.id,
      type: "COMMENT_ADDED",
      data: { commentText: text.trim().substring(0, 100) },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH /api/cards/[id]/comments — editar comentario
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { commentId, text } = await request.json();

    if (!commentId || !text?.trim()) {
      return NextResponse.json({ error: "commentId e text sao obrigatorios" }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { card: { include: { list: { include: { board: { select: { workspaceId: true } } } } } } },
    });

    if (!comment || comment.cardId !== id) {
      return NextResponse.json({ error: "Comentario nao encontrado" }, { status: 404 });
    }

    if (comment.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { text: text.trim() },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });

    logActivity({ cardId: id, userId: user.id, type: "COMMENT_EDITED" });

    return NextResponse.json({ comment: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/cards/[id]/comments — excluir comentario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { commentId } = await request.json();

    if (!commentId) {
      return NextResponse.json({ error: "commentId e obrigatorio" }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });

    if (!comment || comment.cardId !== id) {
      return NextResponse.json({ error: "Comentario nao encontrado" }, { status: 404 });
    }

    if (comment.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id: commentId } });

    logActivity({ cardId: id, userId: user.id, type: "COMMENT_DELETED" });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
