// app/api/notifications/stream/route.ts — Server-Sent Events para notificacoes em tempo real
//
// O browser abre um EventSource para este endpoint.
// O servidor subscreve ao canal Redis do usuario e empurra eventos.
// Quando uma notificacao e criada, o worker publica no canal via Pub/Sub.
//
// Fallback: se Redis nao estiver disponivel, o endpoint retorna 503
// e o NotificationBell usa o polling tradicional.

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createUserSubscriber } from "@/lib/notifications/realtime";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Nao autenticado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Cria subscriber Redis dedicado para este usuario
  const sub = createUserSubscriber(user.id);
  if (!sub) {
    return new Response(JSON.stringify({ error: "Redis indisponivel" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { subscriber, channel } = sub;

  // Cria ReadableStream para SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Envia heartbeat inicial para confirmar conexao
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", userId: user.id })}\n\n`)
      );

      // Heartbeat a cada 30s para manter conexao viva
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Subscreve ao canal do usuario
      subscriber.subscribe(channel).catch(() => {
        // Se falhar, fecha o stream
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already closed */ }
      });

      // Quando recebe mensagem do canal, empurra para o browser
      subscriber.on("message", (_ch: string, message: string) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${message}\n\n`)
          );
        } catch {
          // Stream fechado pelo cliente
          clearInterval(heartbeat);
        }
      });

      // Cleanup quando o cliente desconecta
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        subscriber.unsubscribe(channel).catch(() => {});
        subscriber.quit().catch(() => {});
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
