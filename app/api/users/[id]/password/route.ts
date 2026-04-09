import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

// PATCH /api/users/:id/password
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
    const { currentPassword, newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Nova senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Se não é admin, precisa da senha atual
    if (!isAdmin) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Senha atual é obrigatória" },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return NextResponse.json(
          { error: "Usuário não encontrado" },
          { status: 404 }
        );
      }

      const valid = await verifyPassword(currentPassword, user.password);
      if (!valid) {
        return NextResponse.json(
          { error: "Senha atual incorreta" },
          { status: 401 }
        );
      }
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
