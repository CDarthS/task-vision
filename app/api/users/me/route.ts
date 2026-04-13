import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";
import bcrypt from "bcrypt";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    
    // Ler o body como text se for enorme, ou json. 
    // Como Next.js converte auto, pegamos do json.
    const body = await request.json();
    
    const responseData: Record<string, unknown> = { success: true };
    const updateData: Record<string, unknown> = {};

    if (body.image !== undefined) {
      if (body.image === null || (typeof body.image === 'string' && body.image.startsWith('data:image/'))) {
        updateData.image = body.image;
        responseData.image = body.image;
      } else {
        return NextResponse.json({ error: "Formato de imagem invalido, forneça um data uri de base 64" }, { status: 400 });
      }
    }

    if (body.name) {
      updateData.name = body.name.trim();
    }

    if (body.username !== undefined) {
      if (!body.username.trim()) {
        return NextResponse.json({ error: "Username não pode ser vazio" }, { status: 400 });
      }
      // Check duplicate
      const duplicate = await prisma.user.findFirst({
        where: { username: body.username.trim(), id: { not: user.id } }
      });
      if (duplicate) {
        return NextResponse.json({ error: "Username já em uso" }, { status: 409 });
      }
      updateData.username = body.username.toLowerCase().trim();
    }

    if (body.password) {
      const hashedPassword = await bcrypt.hash(body.password, 10);
      updateData.password = hashedPassword;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    return NextResponse.json(responseData);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    console.error("[UsersMePATCH_Error]", err);
    return NextResponse.json({ error: "Erro interno ao atualizar perfil" }, { status: 500 });
  }
}
