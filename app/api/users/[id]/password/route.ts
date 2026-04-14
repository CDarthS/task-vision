import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteAllUserSessions } from "@/lib/auth/session";

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

    // Limpa TODAS as sessoes antigas do usuario afetado
    await deleteAllUserSessions(id);

    // Se o usuario mudou a PROPRIA senha, cria uma nova sessao para mante-lo logado
    if (isSelf) {
      const { accessToken, httpOnlyToken } = await createSession({
        userId: id,
        remoteAddress:
          request.headers.get("x-forwarded-for") ??
          request.headers.get("x-real-ip") ??
          undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      });

      const isProduction = process.env.NODE_ENV === "production";
      const maxAge = 365 * 24 * 60 * 60;

      const response = NextResponse.json({ success: true });

      response.cookies.set("accessToken", accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
        maxAge,
      });

      response.cookies.set("httpOnlyToken", httpOnlyToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
        maxAge,
      });

      return response;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
