import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";
import { slugifyWithSuffix } from "@/lib/slugify";
import { getRandomGradient } from "@/lib/workspace-gradients";

// GET /api/workspaces — lista workspaces do usuario logado
export async function GET() {
  try {
    const user = await requireUser();

    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      include: {
        _count: {
          select: {
            boards: true,
            members: true,
          },
        },
        owner: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ workspaces });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/workspaces — criar workspace
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nome e obrigatorio" },
        { status: 400 }
      );
    }

    if (name.trim().length > 128) {
      return NextResponse.json(
        { error: "Nome deve ter no maximo 128 caracteres" },
        { status: 400 }
      );
    }

    if (description && description.length > 1024) {
      return NextResponse.json(
        { error: "Descricao deve ter no maximo 1024 caracteres" },
        { status: 400 }
      );
    }

    const slug = slugifyWithSuffix(name.trim());
    const gradient = getRandomGradient();

    // Cria workspace + membership do criador como OWNER numa transacao
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: name.trim(),
          slug,
          description: description?.trim() || null,
          backgroundGradient: gradient.name,
          ownerId: user.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: ws.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      return ws;
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
