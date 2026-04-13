// app/api/admin/fill-usernames/route.ts — Endpoint temporario para preencher usernames vazios
//
// Acesse: https://task-vision-production.up.railway.app/api/admin/fill-usernames
// Apenas admins podem executar. Gera username baseado no email.
// REMOVER este endpoint apos uso.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/get-current-user";

export async function GET() {
  try {
    await requireAdmin();

    // Busca usuarios com username vazio ou null
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: "" },
          { username: null as unknown as string },
        ],
      },
      select: { id: true, email: true, name: true, username: true },
    });

    if (users.length === 0) {
      return NextResponse.json({
        message: "Todos os usuarios ja tem username preenchido!",
        updated: 0,
      });
    }

    const results: { email: string; username: string }[] = [];

    for (const user of users) {
      // Gera username baseado no email (parte antes do @)
      const baseUsername = user.email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");

      let finalUsername = baseUsername || "user";
      let counter = 1;

      // Garante unicidade
      while (true) {
        const existing = await prisma.user.findFirst({
          where: { username: finalUsername, NOT: { id: user.id } },
        });
        if (!existing) break;
        finalUsername = `${baseUsername}${counter}`;
        counter++;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { username: finalUsername },
      });

      results.push({ email: user.email, username: finalUsername });
    }

    return NextResponse.json({
      message: `${results.length} usuario(s) atualizado(s) com sucesso!`,
      updated: results.length,
      results,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ error: "Acesso negado — apenas admins" }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
