import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";

// POST /api/checklists/[id]/items — criar item na checklist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Titulo e obrigatorio" }, { status: 400 });
    }

    // Verifica permissao
    const checklist = await prisma.checklist.findUnique({
      where: { id },
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

    if (!checklist) {
      return NextResponse.json({ error: "Checklist nao encontrada" }, { status: 404 });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: checklist.card.list.board.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    // Calcula posicao
    const lastItem = await prisma.checklistItem.findFirst({
      where: { checklistId: id },
      orderBy: { position: "desc" },
    });
    const position = lastItem ? lastItem.position + 1000 : 1000;

    const item = await prisma.checklistItem.create({
      data: {
        title: title.trim(),
        checklistId: id,
        position,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
