import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";
import { logActivity } from "@/lib/activity";

// GET /api/cards/[id]/checklists — listar checklists do card
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
          include: { board: { select: { workspaceId: true } } },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card nao encontrado" }, { status: 404 });
    }

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

    const checklists = await prisma.checklist.findMany({
      where: { cardId: id },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            assignee: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
      orderBy: { position: "asc" },
    });

    return NextResponse.json({ checklists });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/cards/[id]/checklists — criar checklist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        list: {
          include: { board: { select: { workspaceId: true } } },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card nao encontrado" }, { status: 404 });
    }

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

    // Calcula posicao
    const lastChecklist = await prisma.checklist.findFirst({
      where: { cardId: id },
      orderBy: { position: "desc" },
    });
    const position = lastChecklist ? lastChecklist.position + 1000 : 1000;

    const checklist = await prisma.checklist.create({
      data: {
        title: title?.trim() || "Checklist",
        cardId: id,
        position,
      },
      include: { items: true },
    });

    // Registra atividade
    logActivity({
      cardId: id,
      userId: user.id,
      type: "CHECKLIST_ADDED",
      data: { checklistTitle: checklist.title },
    });

    return NextResponse.json({ checklist }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
