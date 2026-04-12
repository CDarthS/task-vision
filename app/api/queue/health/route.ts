// app/api/queue/health/route.ts — Health check do Redis + BullMQ
//
// Endpoint para verificar conectividade do Redis e status das filas.
// Usado para monitoramento e debugging em producao.

import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { dueDateQueue } from "@/lib/queue/due-date-queue";
import { getWorkerStatus } from "@/lib/queue/due-date-worker";

export async function GET() {
  try {
    // 1. Testa conexao Redis com PING
    const pingStart = Date.now();
    const pong = await redis.ping();
    const pingMs = Date.now() - pingStart;

    // 2. Info basico do Redis
    const info = await redis.info("server");
    const versionMatch = info.match(/redis_version:(\S+)/);
    const redisVersion = versionMatch ? versionMatch[1] : "unknown";

    // 3. Status da fila de due dates
    const queueCounts = await dueDateQueue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );

    // 4. Status do worker
    const workerStatus = getWorkerStatus();

    return NextResponse.json({
      status: "healthy",
      redis: {
        connected: pong === "PONG",
        pingMs,
        version: redisVersion,
      },
      queues: {
        "due-date-notifications": {
          waiting: queueCounts.waiting,
          active: queueCounts.active,
          completed: queueCounts.completed,
          failed: queueCounts.failed,
          delayed: queueCounts.delayed,
        },
      },
      worker: {
        status: workerStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[QueueHealth] Erro:", message);

    return NextResponse.json(
      {
        status: "unhealthy",
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
