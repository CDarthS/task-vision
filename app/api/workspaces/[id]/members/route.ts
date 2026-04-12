import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";

// GET /api/workspaces/[id]/members — listar membros do workspace (leve, sem carregar workspace inteiro)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Verifica se o usuario tem acesso ao workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: user.id } },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({
      members: members.map((m) => m.user),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/workspaces/[id]/members — adicionar membro ao workspace
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email e obrigatorio" }, { status: 400 });
    }

    // Verifica se o workspace existe
    const workspace = await prisma.workspace.findUnique({ where: { id } });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace nao encontrado" }, { status: 404 });
    }

    // Apenas owner ou admin pode adicionar membros
    const isOwner = workspace.ownerId === user.id;
    const isAdmin = user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    // Busca o usuario pelo email (incluindo role global para herança de papel)
    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, image: true, isDeactivated: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario nao encontrado com este email" }, { status: 404 });
    }

    if (targetUser.isDeactivated) {
      return NextResponse.json({ error: "Usuario esta desativado" }, { status: 400 });
    }

    // Verifica se ja e membro
    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: targetUser.id } },
    });

    if (existing) {
      return NextResponse.json({ error: "Usuario ja e membro deste workspace" }, { status: 409 });
    }

    // Admin global herda papel ADMIN no workspace; demais entram como MEMBER
    const workspaceRole = targetUser.role === "ADMIN" ? "ADMIN" : "MEMBER";

    // Adiciona ao workspace
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: id,
        userId: targetUser.id,
        role: workspaceRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/workspaces/[id]/members — remover membro do workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId e obrigatorio" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({ where: { id } });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace nao encontrado" }, { status: 404 });
    }

    // Apenas owner ou admin pode remover membros
    const isOwner = workspace.ownerId === user.id;
    const isAdmin = user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    // Nao pode remover o dono
    if (userId === workspace.ownerId) {
      return NextResponse.json({ error: "Nao pode remover o dono do workspace" }, { status: 400 });
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
