// app/api/notifications/stream/route.ts — Server-Sent Events para notificacoes em tempo real
//
// O browser abre um EventSource para este endpoint.
// O servidor usa um SUBSCRIBER COMPARTILHADO (1 unica conexao Redis para todos os SSE)
// e registra um listener por stream via EventEmitter.
//
// Antes: criava 1 conexao IORedis por stream → esgotava pool → 502
// Agora: 1 conexao compartilhada → O(1) conexoes Redis
//
// Fallback: se Redis nao estiver disponivel, retorna 503
// e o NotificationBell usa o polling tradicional.

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { subscribeUser } from "@/lib/notifications/realtime";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Nao autenticado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Registra listener no subscriber compartilhado
  const encoder = new TextEncoder();
  let cleanupFn: (() => void) | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Envia heartbeat inicial para confirmar conexao
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", userId: user.id })}\n\n`)
      );

      // Heartbeat a cada 30s para manter conexao viva
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          // Stream ja fechado
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Registra listener no subscriber compartilhado
      const sub = subscribeUser(user.id, (message: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        } catch {
          // Stream fechado pelo cliente
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      });

      if (!sub) {
        // Redis indisponivel — fecha stream
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        try { controller.close(); } catch { /* already closed */ }
        return;
      }

      cleanupFn = sub.cleanup;

      // Cleanup quando o cliente desconecta
      request.signal.addEventListener("abort", () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (cleanupFn) cleanupFn();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Desabilita buffering do nginx/proxy
    },
  });
}
