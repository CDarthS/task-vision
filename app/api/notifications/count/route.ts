import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";
import { getCachedCount, setCachedCount } from "@/lib/notifications/cache";

// GET /api/notifications/count — contar notificações não lidas (com cache Redis)
export async function GET() {
  try {
    const user = await requireUser();

    // Tenta ler do cache Redis primeiro
    const cached = await getCachedCount(user.id);
    if (cached !== null) {
      return NextResponse.json({ count: cached, source: "cache" });
    }

    // Cache miss → query Prisma + salva no cache
    const count = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    await setCachedCount(user.id, count);

    return NextResponse.json({ count, source: "db" });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
