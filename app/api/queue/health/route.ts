// app/api/queue/health/route.ts — Health check do Redis + BullMQ
//
// Endpoint para verificar conectividade do Redis e status das filas.
// Usado para monitoramento e debugging em producao.

import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { dueDateQueue } from "@/lib/queue/due-date-queue";
import { getWorkerStatus } from "@/lib/queue/due-date-worker";
import { notificationQueue } from "@/lib/queue/notification-queue";
import { getNotificationWorkerStatus } from "@/lib/queue/notification-worker";

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

    // 3. Status das filas
    const [dueDateCounts, notifCounts] = await Promise.all([
      dueDateQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
      notificationQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
    ]);

    // 4. Status dos workers
    const dueDateWorkerStatus = getWorkerStatus();
    const notifWorkerStatus = getNotificationWorkerStatus();

    return NextResponse.json({
      status: "healthy",
      redis: {
        connected: pong === "PONG",
        pingMs,
        version: redisVersion,
      },
      queues: {
        "due-date-notifications": {
          waiting: dueDateCounts.waiting,
          active: dueDateCounts.active,
          completed: dueDateCounts.completed,
          failed: dueDateCounts.failed,
          delayed: dueDateCounts.delayed,
        },
        "notification-dispatch": {
          waiting: notifCounts.waiting,
          active: notifCounts.active,
          completed: notifCounts.completed,
          failed: notifCounts.failed,
          delayed: notifCounts.delayed,
        },
      },
      workers: {
        "due-date": dueDateWorkerStatus,
        "notification-dispatch": notifWorkerStatus,
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
