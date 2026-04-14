import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth/get-current-user";
import { hashPassword } from "@/lib/auth/password";
import { deleteAllUserSessions } from "@/lib/auth/session";

// GET /api/users/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isDeactivated: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH /api/users/:id — atualizar usuario
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireUser();
    const { id } = await params;

    const isAdmin = currentUser.role === "ADMIN";
    const isSelf = currentUser.id === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    // Campos que qualquer usuario pode alterar no proprio perfil
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.username !== undefined) {
      if (!body.username.trim()) {
        return NextResponse.json({ error: "Username não pode ser vazio" }, { status: 400 });
      }
      data.username = body.username.toLowerCase().trim();
    }

    // Campos que apenas admin pode alterar
    if (isAdmin) {
      if (body.role !== undefined) data.role = body.role;
      if (body.isDeactivated !== undefined)
        data.isDeactivated = body.isDeactivated;
      if (body.email !== undefined)
        data.email = body.email.toLowerCase().trim();
      // Atualizar senha (opcional — apenas se fornecida)
      if (body.password && body.password.trim().length >= 6) {
        data.password = await hashPassword(body.password.trim());
        data.passwordChangedAt = new Date();
      }
    }

    // Validar duplicidade de email e username (excluindo o proprio usuario)
    const orConditions: { email?: string; username?: string }[] = [];
    if (data.email) orConditions.push({ email: data.email as string });
    if (data.username) orConditions.push({ username: data.username as string });

    if (orConditions.length > 0) {
      const conflict = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { OR: orConditions },
          ],
        },
      });

      if (conflict) {
        return NextResponse.json(
          { error: "Já existe outro usuário com este email ou username" },
          { status: 409 }
        );
      }
    }

    const passwordWasChanged = !!data.passwordChangedAt;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isDeactivated: true,
        createdAt: true,
      },
    });

    // Se a senha foi alterada pelo admin, limpar sessoes do usuario afetado
    // para forcar novo login com a senha atualizada
    if (passwordWasChanged) {
      await deleteAllUserSessions(id);
    }

    // Se o usuario foi desativado, limpar sessoes para forcar logout imediato
    if (data.isDeactivated === true) {
      await deleteAllUserSessions(id);
    }

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/users/:id — deletar usuario (apenas admin)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    if (admin.id === id) {
      return NextResponse.json(
        { error: "Você não pode deletar a si mesmo" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
