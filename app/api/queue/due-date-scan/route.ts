// app/api/queue/due-date-scan/route.ts — Enfileira scan de due dates no BullMQ
//
// Substitui a chamada sincrona do cron-overdue.
// Em vez de processar direto na API route, enfileira um job no BullMQ
// que sera processado pelo worker de forma assincrona.
//
// Mantem compatibilidade com o polling do NotificationBell.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/get-current-user";
import { enqueueDueDateScan } from "@/lib/queue/due-date-queue";
import { ensureWorkerRunning } from "@/lib/queue/due-date-worker";

// GET /api/queue/due-date-scan
// Chamado pelo polling do NotificationBell (a cada ~2 minutos)
export async function GET() {
  try {
    await requireUser(); // Apenas usuarios autenticados

    // Garante que o worker esta rodando
    ensureWorkerRunning();

    // Enfileira o scan (sera processado pelo worker)
    const job = await enqueueDueDateScan("cron-virtual");

    return NextResponse.json({
      queued: true,
      jobId: job.id,
      message: "Scan de due dates enfileirado para processamento assincrono",
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    console.error("[DueDateScan] Erro ao enfileirar:", err);
    return NextResponse.json(
      { error: "Erro ao enfileirar scan" },
      { status: 500 }
    );
  }
}
